import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Radio,
  RefreshCw,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  User,
  VideoOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

interface AIInterviewRoomProps {
  roomToken?: string;
  candidateName?: string;
  jobTitle?: string;
  durationMinutes?: number;
  onExit?: () => void;
}

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';
export type SpeakerMode = 'ai' | 'candidate' | 'idle';
export type InterviewTurnState =
  | 'AI_SPEAKING'
  | 'CANDIDATE_LISTENING'
  | 'CANDIDATE_SPEAKING'
  | 'AI_PROCESSING'
  | 'INTERVIEW_COMPLETED';

// ─────────────────────────────────────────────────────────────────────────────
// Audio playback helper — plays raw PCM or webm audio from Gemini
// ─────────────────────────────────────────────────────────────────────────────
async function playAudioBuffer(audioCtx: AudioContext, audioData: ArrayBuffer, mimeType: string) {
  try {
    if (mimeType.includes('pcm')) {
      // Raw PCM: 16-bit little-endian, 24000 Hz, mono
      const pcm16 = new Int16Array(audioData);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }
      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    } else {
      const decoded = await audioCtx.decodeAudioData(audioData.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch {
    // Silently ignore partial chunk decode errors
  }
}

export const AIInterviewRoom: React.FC<AIInterviewRoomProps> = ({
  roomToken = 'room_live_gemini_7721',
  candidateName = 'Candidate',
  jobTitle = 'Senior Full Stack Engineer',
  durationMinutes = 30,
  onExit,
}) => {
  // ── Turn-Based Conversation States ─────────────────────────────────────────
  const [interviewState, setInterviewState] = useState<InterviewTurnState>('AI_SPEAKING');
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [totalTurns, setTotalTurns] = useState<number>(5);
  const [turnNotification, setTurnNotification] = useState<string>('Interviewer is greeting and introducing session...');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  // ── Device States ──────────────────────────────────────────────────────────
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraStreamAvailable, setCameraStreamAvailable] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // ── Speaker / Activity ─────────────────────────────────────────────────────
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerMode>('idle');

  // ── Timer & Session ────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── WebSocket & Connection ─────────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [geminiConnected, setGeminiConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  // ── Captions / Transcripts ─────────────────────────────────────────────────
  const [showCaptions, setShowCaptions] = useState(true);
  const [aiTranscript, setAiTranscript] = useState('');
  const [captionBuffer, setCaptionBuffer] = useState('');

  // ── Modals & UI ────────────────────────────────────────────────────────────
  const [endConfirmModalOpen, setEndConfirmModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exitSuccess, setExitSuccess] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 4;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceDetectFrameRef = useRef<number>(0);

  // Turn management refs (avoids stale closures inside RAF & event loops)
  const interviewStateRef = useRef<InterviewTurnState>('AI_SPEAKING');
  interviewStateRef.current = interviewState;

  const hasSpokenRef = useRef<boolean>(false);
  const silenceCounterRef = useRef<number>(0);

  // ── Format Elapsed Time ────────────────────────────────────────────────────
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Session Elapsed Timer
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Candidate Camera Setup (WebRTC Video Only)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let active = true;

    async function initCamera() {
      if (!cameraEnabled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        setCameraStreamAvailable(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (active) {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraStreamAvailable(true);
          setPermissionError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setCameraStreamAvailable(false);
          const name = (err as DOMException)?.name;
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setPermissionError('camera');
          } else if (name === 'NotFoundError') {
            setPermissionError('no_camera');
          }
        }
      }
    }

    initCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraEnabled]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Candidate Microphone + VAD + Silence Detection
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFinishCandidateTurn = useCallback(() => {
    if (interviewStateRef.current !== 'CANDIDATE_SPEAKING') return;

    logger_turn('Candidate finished speaking turn');
    setInterviewState('AI_PROCESSING');
    interviewStateRef.current = 'AI_PROCESSING';
    setActiveSpeaker('idle');
    setSilenceCountdown(null);
    hasSpokenRef.current = false;
    silenceCounterRef.current = 0;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'candidate_turn_done',
          turn: currentTurn,
        })
      );
    }
  }, [currentTurn]);

  const stopMicCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    mediaRecorderRef.current = null;
    if (voiceDetectFrameRef.current) {
      cancelAnimationFrame(voiceDetectFrameRef.current);
    }
  }, []);

  const startMicCapture = useCallback(async () => {
    if (!micEnabled) return;
    try {
      // Acoustic Echo Cancellation + Noise Suppression for clean duplex separation
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });
      audioStreamRef.current = audioStream;
      setPermissionError(null);

      // AudioContext + AnalyserNode for VAD and Audio Wave
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const audioCtx = audioCtxRef.current;
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const VOICE_THRESHOLD = 14;

      function detectVoice() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        const currentState = interviewStateRef.current;

        if (currentState === 'CANDIDATE_SPEAKING') {
          if (avg > VOICE_THRESHOLD) {
            // Candidate is speaking
            hasSpokenRef.current = true;
            silenceCounterRef.current = 0;
            setSilenceCountdown(null);
            setActiveSpeaker('candidate');
          } else if (hasSpokenRef.current) {
            // Candidate spoke earlier in this turn and is now pausing
            silenceCounterRef.current += 1;

            // ~1.5s of silence: show visual countdown (approx 90 frames at 60fps)
            if (silenceCounterRef.current >= 90 && silenceCounterRef.current < 160) {
              const secondsLeft = Math.ceil((160 - silenceCounterRef.current) / 35);
              setSilenceCountdown(secondsLeft);
              setActiveSpeaker('idle');
            } else if (silenceCounterRef.current >= 160) {
              // 2.5s total silence after speaking -> auto-finish turn!
              silenceCounterRef.current = 0;
              setSilenceCountdown(null);
              handleFinishCandidateTurn();
            } else {
              setActiveSpeaker('idle');
            }
          } else {
            setActiveSpeaker('idle');
          }
        } else if (currentState === 'AI_SPEAKING') {
          setActiveSpeaker('ai');
          setSilenceCountdown(null);
        } else {
          setActiveSpeaker('idle');
          setSilenceCountdown(null);
        }

        voiceDetectFrameRef.current = requestAnimationFrame(detectVoice);
      }

      voiceDetectFrameRef.current = requestAnimationFrame(detectVoice);

      // MediaRecorder: Streams audio ONLY during candidate's speaking turn
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        // STRICT TURN GATE: Ignore and discard any audio when not candidate's turn
        // This ensures zero echo, feedback or interruption while AI speaks
        if (
          e.data.size > 0 &&
          wsRef.current?.readyState === WebSocket.OPEN &&
          micEnabled &&
          interviewStateRef.current === 'CANDIDATE_SPEAKING'
        ) {
          const arrayBuf = await e.data.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
          wsRef.current.send(
            JSON.stringify({ type: 'audio', data: b64, mime_type: mimeType })
          );
        }
      };

      recorder.start(250);
    } catch (err: unknown) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermissionError('mic');
      } else if (name === 'NotFoundError') {
        setPermissionError('no_mic');
      }
    }
  }, [micEnabled, handleFinishCandidateTurn]);

  // Restart/pause mic stream based on micEnabled toggle
  useEffect(() => {
    if (micEnabled && connectionStatus === 'CONNECTED') {
      startMicCapture();
    } else {
      stopMicCapture();
    }
    return () => stopMicCapture();
  }, [micEnabled, connectionStatus, startMicCapture, stopMicCapture]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. WebSocket & Turn Protocol Management
  // ═══════════════════════════════════════════════════════════════════════════
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    const jwtToken = localStorage.getItem('access_token') || '';
    const defaultWsHost = window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.hostname}:8000`;
    const wsBase = import.meta.env.VITE_WS_URL || defaultWsHost;
    const wsUrl = `${wsBase}/api/v1/ws/interview/${roomToken}?token=${encodeURIComponent(jwtToken)}`;

    setConnectionStatus('CONNECTING');
    setGeminiConnected(false);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('CONNECTED');
      reconnectAttemptsRef.current = 0;
      setReconnectCount(0);

      // Latency ping every 5 seconds
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingTimestampRef.current = Date.now();
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 5000);
    };

    ws.onmessage = async (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const msgType = msg.type as string;

      switch (msgType) {
        case 'connected':
          if (msg.state) {
            setInterviewState(msg.state as InterviewTurnState);
            interviewStateRef.current = msg.state as InterviewTurnState;
          }
          if (msg.current_turn) setCurrentTurn(msg.current_turn as number);
          if (msg.total_turns) setTotalTurns(msg.total_turns as number);
          break;

        case 'gemini_connected':
          setGeminiConnected(true);
          break;

        // Turn-Based State Machine Transition
        case 'state_change': {
          const newState = msg.state as InterviewTurnState;
          setInterviewState(newState);
          interviewStateRef.current = newState;
          if (msg.current_turn) setCurrentTurn(msg.current_turn as number);
          if (msg.total_turns) setTotalTurns(msg.total_turns as number);
          if (msg.reason) setTurnNotification(msg.reason as string);

          if (newState === 'CANDIDATE_SPEAKING') {
            hasSpokenRef.current = false;
            silenceCounterRef.current = 0;
            setSilenceCountdown(null);
            setActiveSpeaker('idle');
          } else if (newState === 'AI_SPEAKING') {
            setActiveSpeaker('ai');
          } else if (newState === 'INTERVIEW_COMPLETED') {
            setEndConfirmModalOpen(false);
            setExitSuccess(true);
          }
          break;
        }

        case 'ai_audio': {
          const b64 = msg.data as string;
          const mimeType = (msg.mime_type as string) || 'audio/pcm';
          try {
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const arrayBuf = bytes.buffer;

            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
              audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
            }
            if (audioCtxRef.current.state === 'suspended') {
              await audioCtxRef.current.resume();
            }

            setInterviewState('AI_SPEAKING');
            interviewStateRef.current = 'AI_SPEAKING';
            setActiveSpeaker('ai');
            await playAudioBuffer(audioCtxRef.current, arrayBuf, mimeType);
          } catch {
            // Ignore audio decode errors
          }
          break;
        }

        case 'ai_text':
          setCaptionBuffer((prev) => prev + (msg.data as string));
          break;

        case 'ai_turn_complete':
          setAiTranscript((prev) => {
            const full = (prev ? prev + ' ' : '') + captionBuffer;
            return full.slice(-600);
          });
          setCaptionBuffer('');
          break;

        case 'ai_interrupted':
          setCaptionBuffer('');
          setActiveSpeaker('idle');
          break;

        case 'pong':
          if (pingTimestampRef.current) {
            setLatencyMs(Date.now() - pingTimestampRef.current);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'session_ended':
          handleConfirmEndInterview();
          break;

        case 'error':
          console.warn('[Interview WS] Server message:', msg.message);
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      setConnectionStatus('ERROR');
    };

    ws.onclose = (event) => {
      setConnectionStatus('DISCONNECTED');
      setGeminiConnected(false);

      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && !exitSuccess) {
        const delay = Math.pow(2, reconnectAttemptsRef.current) * 1500;
        reconnectAttemptsRef.current += 1;
        setReconnectCount(reconnectAttemptsRef.current);
        setConnectionStatus('RECONNECTING');
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else if (event.code !== 1000) {
        setConnectionStatus('DISCONNECTED');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomToken, captionBuffer]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close(1000, 'Component unmounted');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (voiceDetectFrameRef.current) cancelAnimationFrame(voiceDetectFrameRef.current);
      audioCtxRef.current?.close();
    };
  }, [connectWebSocket]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. UI Handlers
  // ═══════════════════════════════════════════════════════════════════════════
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleConfirmEndInterview = () => {
    setEndConfirmModalOpen(false);
    setExitSuccess(true);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
    }

    stopMicCapture();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    setTimeout(() => {
      if (onExit) {
        onExit();
      } else {
        window.location.href = '/';
      }
    }, 2000);
  };

  // Helper logger for turns
  function logger_turn(action: string) {
    console.log(`[Turn System] ${action} (Turn: ${currentTurn}/${totalTurns})`);
  }

  // Connection status helpers
  const statusColor: Record<ConnectionStatus, string> = {
    CONNECTING: 'text-amber-400',
    CONNECTED: 'text-emerald-400',
    RECONNECTING: 'text-amber-400',
    DISCONNECTED: 'text-rose-400',
    ERROR: 'text-rose-400',
  };
  const statusLabel: Record<ConnectionStatus, string> = {
    CONNECTING: 'Connecting…',
    CONNECTED: geminiConnected ? 'Live · Turn-Based AI' : 'Live',
    RECONNECTING: `Reconnecting (${reconnectCount}/${MAX_RECONNECT_ATTEMPTS})…`,
    DISCONNECTED: 'Disconnected',
    ERROR: 'Connection Error',
  };

  // Captions text
  const displayCaption = captionBuffer || aiTranscript || (
    geminiConnected
      ? 'Dr. Gemini is ready. Please listen to the question.'
      : 'Connecting to AI Interview Room…'
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans">

      {/* ════════════════════════════════════════════════════════════════════
          1. TOP HEADER BAR
         ════════════════════════════════════════════════════════════════════ */}
      <header className="h-16 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
        {/* Left: Branding & Position */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-white text-sm tracking-tight">
                AI Turn-Based Interview Room
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Gemini Live 2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Position: <span className="text-slate-200">{jobTitle}</span> • Room:{' '}
              <span className="font-mono text-purple-300">{roomToken}</span>
            </p>
          </div>
        </div>

        {/* Center: Turn Progress & Latency */}
        <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-slate-700/80 shadow-inner">
          {/* Turn Counter Indicator */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Turn {currentTurn} of {totalTurns}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalTurns }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i + 1 < currentTurn
                      ? 'bg-emerald-400'
                      : i + 1 === currentTurn
                      ? 'bg-purple-400 ring-2 ring-purple-400/50 animate-pulse'
                      : 'bg-slate-700'
                  }`}
                  title={`Question ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Session Timer */}
          <div className="flex items-center gap-1.5 font-mono text-xs text-white">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(elapsedSeconds)}</span>
            <span className="text-slate-500 text-[10px]">/ {durationMinutes}:00</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {connectionStatus === 'DISCONNECTED' || connectionStatus === 'ERROR' ? (
              <WifiOff className={`w-3.5 h-3.5 ${statusColor[connectionStatus]}`} />
            ) : connectionStatus === 'RECONNECTING' ? (
              <RefreshCw className={`w-3.5 h-3.5 animate-spin ${statusColor[connectionStatus]}`} />
            ) : (
              <Wifi className={`w-3.5 h-3.5 ${statusColor[connectionStatus]}`} />
            )}
            <span className={`font-bold ${statusColor[connectionStatus]}`}>
              {statusLabel[connectionStatus]}
            </span>
            {latencyMs !== null && connectionStatus === 'CONNECTED' && (
              <span className="text-slate-500 text-[10px]">({latencyMs}ms)</span>
            )}
          </div>
        </div>

        {/* Right: Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setEndConfirmModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Call</span>
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          TURN STATUS NOTIFICATION BANNER
         ════════════════════════════════════════════════════════════════════ */}
      <div
        className={`px-6 py-2.5 border-b flex items-center justify-between text-xs transition-colors z-20 ${
          interviewState === 'AI_SPEAKING' || interviewState === 'CANDIDATE_LISTENING'
            ? 'bg-purple-950/80 border-purple-800/60 text-purple-200'
            : interviewState === 'CANDIDATE_SPEAKING'
            ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-200'
            : interviewState === 'AI_PROCESSING'
            ? 'bg-amber-950/80 border-amber-800/60 text-amber-200'
            : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-200'
        }`}
      >
        <div className="flex items-center gap-2.5 font-bold">
          {interviewState === 'AI_SPEAKING' || interviewState === 'CANDIDATE_LISTENING' ? (
            <>
              <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>
                AI INTERVIEWER IS SPEAKING — Question #{currentTurn} ({turnNotification || 'Mic gated to prevent echo'})
              </span>
            </>
          ) : interviewState === 'CANDIDATE_SPEAKING' ? (
            <>
              <Mic className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span>
                IT'S YOUR TURN TO SPEAK — Answer Question #{currentTurn} of {totalTurns}. AI is listening silently.
              </span>
            </>
          ) : interviewState === 'AI_PROCESSING' ? (
            <>
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span>
                DR. GEMINI IS PROCESSING YOUR ANSWER — {turnNotification || 'Analyzing response...'}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>INTERVIEW COMPLETED — All questions concluded successfully!</span>
            </>
          )}
        </div>

        {/* Candidate Turn Action Button */}
        {interviewState === 'CANDIDATE_SPEAKING' && (
          <div className="flex items-center gap-2">
            {silenceCountdown !== null && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg text-[11px] animate-pulse">
                Silence detected • Submitting in {silenceCountdown}s...
              </span>
            )}
            <button
              onClick={handleFinishCandidateTurn}
              className="px-3.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>I've Finished Answering</span>
            </button>
          </div>
        )}
      </div>

      {/* Permission Warning */}
      {permissionError && (
        <div className="bg-rose-900/80 border-b border-rose-700/60 px-6 py-2 flex items-center gap-3 text-xs text-rose-200 z-30">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold">
            {permissionError === 'mic'
              ? 'Microphone access denied. Please grant microphone permissions and reload.'
              : permissionError === 'camera'
              ? 'Camera access denied. Please grant camera permissions in your browser.'
              : 'Device not found. Please verify your camera and microphone are connected.'}
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          2. MAIN SPLIT-SCREEN
         ════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col justify-center">
        <div className="h-full w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">

          {/* ═════ LEFT: AI INTERVIEWER AVATAR ═════ */}
          <div
            className={`relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/60 to-slate-900 border transition-all duration-500 flex flex-col justify-between p-6 sm:p-8 shadow-2xl ${
              interviewState === 'AI_SPEAKING'
                ? 'border-purple-500/80 ring-4 ring-purple-500/20 shadow-purple-900/30'
                : 'border-slate-800 shadow-slate-950'
            }`}
          >
            {/* AI Top Info */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="font-extrabold text-xs text-white">Dr. Gemini AI</span>
                <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.5 rounded">
                  Lead Interviewer
                </span>
              </div>

              {/* Status Badge */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  interviewState === 'AI_SPEAKING'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-xs'
                    : interviewState === 'AI_PROCESSING'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/40'
                }`}
              >
                {interviewState === 'AI_PROCESSING' ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <Radio
                    className={`w-3.5 h-3.5 ${
                      interviewState === 'AI_SPEAKING' ? 'text-purple-400 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                )}
                <span>
                  {interviewState === 'AI_SPEAKING'
                    ? 'AI is speaking...'
                    : interviewState === 'AI_PROCESSING'
                    ? 'AI is thinking...'
                    : 'AI is listening'}
                </span>
              </div>
            </div>

            {/* AI Hologram Orb Animation */}
            <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
              <div className="relative flex items-center justify-center">
                {interviewState === 'AI_SPEAKING' && (
                  <>
                    <div className="absolute w-56 h-56 rounded-full bg-purple-600/15 animate-ping duration-1000" />
                    <div className="absolute w-44 h-44 rounded-full bg-indigo-500/25 animate-pulse" />
                    <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 blur-xl opacity-60 animate-pulse" />
                  </>
                )}

                {interviewState === 'AI_PROCESSING' && (
                  <div className="absolute w-44 h-44 rounded-full bg-amber-500/15 animate-ping duration-1000" />
                )}

                <div
                  className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-slate-950 via-purple-900 to-indigo-700 p-1 flex items-center justify-center shadow-2xl transition-transform duration-300 ${
                    interviewState === 'AI_SPEAKING' ? 'scale-105 shadow-purple-500/40' : 'scale-100 shadow-slate-900'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-slate-950/90 flex flex-col items-center justify-center relative overflow-hidden border border-purple-400/30">
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 via-transparent to-indigo-500/20 animate-pulse" />
                    <Sparkles className="w-10 h-10 sm:w-14 sm:h-14 text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]" />
                    <span className="text-[9px] font-black text-indigo-200 tracking-widest uppercase mt-1">
                      Gemini Multimodal
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Voice Waveform */}
              <div className="flex items-center gap-1.5 mt-8 h-8">
                {interviewState === 'AI_SPEAKING' ? (
                  <>
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-1" />
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-2" />
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-3" />
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-4" />
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-5" />
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-2" />
                    <span className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-wave-1" />
                  </>
                ) : (
                  <div className="flex items-center gap-1 opacity-30">
                    {[1, 2, 3, 4, 5, 6, 7].map((b) => (
                      <span key={b} className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Captions */}
            {showCaptions && (
              <div className="z-10 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>AI Dialogue (Live Transcription)</span>
                  <span className="ml-auto text-slate-400 text-[10px] font-mono normal-case">
                    Question {currentTurn}/{totalTurns}
                  </span>
                </div>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  &ldquo;{displayCaption}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* ═════ RIGHT: CANDIDATE LIVE CAMERA ═════ */}
          <div
            className={`relative rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-500 flex flex-col justify-between p-6 sm:p-8 shadow-2xl ${
              interviewState === 'CANDIDATE_SPEAKING'
                ? 'border-emerald-500/80 ring-4 ring-emerald-500/20 shadow-emerald-950/40'
                : 'border-slate-800 shadow-slate-950'
            }`}
          >
            {/* Live Camera Feed */}
            {cameraEnabled && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${
                  cameraStreamAvailable ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />
            )}

            {/* Fallback Overlay */}
            {(!cameraEnabled || !cameraStreamAvailable) && (
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl mb-3">
                  {candidateName.charAt(0) || 'C'}
                </div>
                <h3 className="font-extrabold text-base text-white">{candidateName}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>{!cameraEnabled ? 'Camera turned off' : 'Connecting to webcam…'}</span>
                </p>
              </div>
            )}

            {/* Candidate Header Tag */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-xs text-white">{candidateName}</span>
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  Candidate (You)
                </span>
              </div>

              {/* Turn & Mic Status */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                  interviewState === 'CANDIDATE_SPEAKING'
                    ? activeSpeaker === 'candidate'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 ring-2 ring-emerald-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700/40'
                }`}
              >
                {interviewState === 'CANDIDATE_SPEAKING' ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{activeSpeaker === 'candidate' ? 'Speaking…' : 'Your Turn'}</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Listening (Mic Gated)</span>
                  </>
                )}
              </div>
            </div>

            {/* Candidate Audio Wave & Manual Finish Turn Button */}
            <div className="z-10 mt-auto flex items-end justify-between gap-3">
              <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">Audio Input:</span>
                <div className="flex items-center gap-1 h-4">
                  {interviewState === 'CANDIDATE_SPEAKING' && activeSpeaker === 'candidate' ? (
                    <>
                      <span className="w-1 bg-emerald-400 rounded-full animate-wave-1" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-wave-3" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-wave-5" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-wave-2" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-wave-4" />
                    </>
                  ) : (
                    <div className="flex items-center gap-1 opacity-30">
                      {[1, 2, 3, 4, 5].map((b) => (
                        <span key={b} className="w-1 h-1 bg-slate-500 rounded-full" />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Done Answering Action Button */}
              {interviewState === 'CANDIDATE_SPEAKING' ? (
                <button
                  onClick={handleFinishCandidateTurn}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2 animate-pulse"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Done Speaking</span>
                </button>
              ) : (
                <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono">
                  1080p • 30fps
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          3. BOTTOM FLOATING CONTROL DOCK
         ════════════════════════════════════════════════════════════════════ */}
      <footer className="h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center px-6 z-20 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/80 px-6 py-2.5 rounded-3xl border border-slate-800/80 shadow-2xl">
          {/* Mic Toggle */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer font-bold text-xs flex items-center gap-2 ${
              micEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50'
            }`}
            title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={() => setCameraEnabled(!cameraEnabled)}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer font-bold text-xs flex items-center gap-2 ${
              cameraEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50'
            }`}
            title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraEnabled ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Captions Toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer font-bold text-xs ${
              showCaptions
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Toggle Live Subtitles"
          >
            <span className="font-extrabold text-xs block leading-none">CC</span>
          </button>

          <div className="h-6 w-px bg-slate-800" />

          {/* Done Speaking Shortcut Button */}
          {interviewState === 'CANDIDATE_SPEAKING' && (
            <button
              onClick={handleFinishCandidateTurn}
              className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Submit Answer</span>
            </button>
          )}

          {/* Reconnect Button */}
          {(connectionStatus === 'DISCONNECTED' || connectionStatus === 'ERROR') && (
            <button
              onClick={() => {
                reconnectAttemptsRef.current = 0;
                connectWebSocket();
              }}
              className="px-4 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reconnect</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={() => setEndConfirmModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End Interview</span>
          </button>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════════════
          4. END INTERVIEW CONFIRMATION MODAL
         ════════════════════════════════════════════════════════════════════ */}
      {endConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <PhoneOff className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Conclude AI Interview Session?</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Ending will finalize your session. All answers will be compiled for Gemini evaluation and scorecard generation.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Completed Turns:</span>
                <span className="font-mono font-bold text-emerald-400">{currentTurn - 1} of {totalTurns}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Elapsed Time:</span>
                <span className="font-mono font-bold text-white">{formatTime(elapsedSeconds)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Room Token:</span>
                <span className="font-mono text-purple-300">{roomToken}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setEndConfirmModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Resume Interview
              </button>
              <button
                onClick={handleConfirmEndInterview}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Conclude & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          5. SETTINGS MODAL
         ════════════════════════════════════════════════════════════════════ */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-white text-sm">Turn-Based Interview Settings</h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Turn State:</label>
                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 font-mono text-purple-300">
                  {interviewState} (Turn {currentTurn} of {totalTurns})
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Acoustic Echo Prevention:</label>
                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-emerald-400">
                  ✓ Active (Hardware Echo Cancellation + Software Half-Duplex Turn Gating)
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">VAD & Silence Detection:</label>
                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-300">
                  Auto-finish turn after 2.5 seconds of silence or click "Done Speaking"
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          6. EXIT / COMPLETION SUCCESS OVERLAY
         ════════════════════════════════════════════════════════════════════ */}
      {exitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
          <div className="text-center space-y-3 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Interview Concluded Successfully</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thank you, {candidateName}! All conversation turns have been recorded. The Gemini evaluation engine is synthesizing your scorecard. Redirecting...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
