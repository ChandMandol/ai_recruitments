import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Bot,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  History,
  Loader2,
  Mic,
  MicOff,
  Play,
  Radio,
  RotateCcw,
  Send,
  Sparkles,
  StopCircle,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Upload,
  User,
  VideoOff,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adaptiveInterviewApi } from '../../api/adaptiveInterview';
import { candidateApi } from '../../api/candidate';
import type {
  AnswerEvaluationResponse,
  AssessmentResponse,
  QuestionDetail,
  SummaryReport,
} from '../../types/adaptiveInterview';

const JOB_CATEGORIES = [
  { id: 'Full Stack Developer', label: 'Full Stack Developer', desc: 'React, Node, DBs, Architecture' },
  { id: 'Frontend Developer', label: 'Frontend Developer', desc: 'React, TypeScript, CSS, Core Web Vitals' },
  { id: 'Backend Developer', label: 'Backend Developer', desc: 'Python, Node, PostgreSQL, Scalability' },
  { id: 'DevOps & Cloud Engineer', label: 'DevOps & Cloud', desc: 'Docker, K8s, CI/CD, AWS/GCP' },
  { id: 'Data Scientist & AI Engineer', label: 'AI & Data Science', desc: 'Machine Learning, LLMs, NLP, Python' },
  { id: 'Mobile App Developer', label: 'Mobile Developer', desc: 'React Native, Flutter, iOS, Android' },
  { id: 'QA & Automation Engineer', label: 'QA Engineer', desc: 'Test Automation, Cypress, Integration' },
  { id: 'Cybersecurity Analyst', label: 'Cybersecurity', desc: 'OWASP, Auth, Cryptography, SecOps' },
];

const INTERVIEW_LEVELS = [
  { id: 'Junior', label: 'Junior', sub: 'Foundations & Core Principles' },
  { id: 'Mid-Level', label: 'Mid-Level', sub: 'Real-world Architecture & APIs' },
  { id: 'Senior', label: 'Senior', sub: 'Scalability, Concurrency & Trade-offs' },
  { id: 'Lead', label: 'Lead', sub: 'System Design & Engineering Strategy' },
];

export const AdaptiveInterview: React.FC = () => {
  const { user } = useAuth();

  // Navigation & Views: 'setup' | 'live' | 'summary' | 'history'
  const [viewState, setViewState] = useState<'setup' | 'live' | 'summary' | 'history'>('setup');

  // Setup Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('Full Stack Developer');
  const [selectedLevel, setSelectedLevel] = useState<string>('Mid-Level');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useProfileCv, setUseProfileCv] = useState<boolean>(true);
  const [hasProfileCv, setHasProfileCv] = useState<boolean>(false);
  const [profileCvName, setProfileCvName] = useState<string>('');

  // Live Session State
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentResponse | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionDetail | null>(null);
  const [answerText, setAnswerText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<AnswerEvaluationResponse | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);

  // Split-Screen Real-Time Video Call & Avatar States
  type AvatarMode = 'AI_SPEAKING' | 'WAITING_FOR_ANSWER' | 'CANDIDATE_SPEAKING' | 'AI_EVALUATING';
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('AI_SPEAKING');
  const [silenceSeconds, setSilenceSeconds] = useState<number>(30);
  const hasStartedAnsweringRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Camera & Device Stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraStreamAvailable, setCameraStreamAvailable] = useState<boolean>(false);

  // History State
  const [historyList, setHistoryList] = useState<AssessmentResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Summary State
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  // Fetch candidate profile to check for existing CV
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const prof = await candidateApi.getProfile();
        if (prof && prof.resume_url) {
          setHasProfileCv(true);
          setProfileCvName(prof.resume_filename || 'Uploaded Resume');
        }
      } catch (e) {
        // Ignored if candidate has not uploaded CV yet
      }
    };
    checkProfile();
  }, []);

  // Camera Setup Effect for Split-Screen Video Call
  useEffect(() => {
    let active = true;

    if (viewState !== 'live') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraStreamAvailable(false);
      return;
    }

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
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraStreamAvailable(true);
        }
      } catch (err) {
        console.warn('Camera access denied or device not found:', err);
        if (active) setCameraStreamAvailable(false);
      }
    }

    initCamera();

    return () => {
      active = false;
      if (viewState !== 'live' && streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [viewState, cameraEnabled]);

  // AI Speech Synthesis (Speaks questions and feedback aloud)
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      setAvatarMode('WAITING_FOR_ANSWER');
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    setAvatarMode('AI_SPEAKING');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Guy'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setAvatarMode('WAITING_FOR_ANSWER');
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setAvatarMode('WAITING_FOR_ANSWER');
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Continuous Speech Recognition for Candidate
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || !micEnabled) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) {
          hasStartedAnsweringRef.current = true;
          setAvatarMode('CANDIDATE_SPEAKING');
          setAnswerText(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  }, [micEnabled]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  }, []);

  const toggleMicCapture = () => {
    if (isRecording) {
      stopSpeechRecognition();
      setMicEnabled(false);
    } else {
      setMicEnabled(true);
      startSpeechRecognition();
    }
  };

  const onAnswerTextChange = (text: string) => {
    setAnswerText(text);
    if (text.trim().length > 0) {
      hasStartedAnsweringRef.current = true;
      if (avatarMode === 'WAITING_FOR_ANSWER') {
        setAvatarMode('CANDIDATE_SPEAKING');
      }
    }
  };

  // Auto-speak question when activeQuestion changes and begin 30s countdown
  useEffect(() => {
    if (viewState === 'live' && activeQuestion) {
      setAnswerText('');
      setSilenceSeconds(30);
      hasStartedAnsweringRef.current = false;
      setAvatarMode('AI_SPEAKING');

      const timer = setTimeout(() => {
        speakText(activeQuestion.question, () => {
          // AI finished asking question: candidate's turn begins!
          setAvatarMode('WAITING_FOR_ANSWER');
          if (micEnabled) {
            startSpeechRecognition();
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [viewState, activeQuestion?.index, speakText, micEnabled, startSpeechRecognition]);

  // 30-Second Silence Auto-Advance Countdown
  useEffect(() => {
    if (
      viewState !== 'live' ||
      avatarMode !== 'WAITING_FOR_ANSWER' ||
      !activeQuestion ||
      isSubmitting ||
      showFeedbackModal
    ) {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      return;
    }

    // If candidate has started speaking or typed an answer, stop the 30s timer
    if (hasStartedAnsweringRef.current || answerText.trim().length > 0) {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      return;
    }

    silenceTimerRef.current = setInterval(() => {
      setSilenceSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(silenceTimerRef.current!);
          handleAutoTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    };
  }, [viewState, avatarMode, activeQuestion, isSubmitting, showFeedbackModal, answerText]);

  // Start Assessment Handler
  const handleStartAssessment = async () => {
    setSessionLoading(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('job_category', selectedCategory);
      formData.append('interview_level', selectedLevel);
      formData.append('use_profile_cv', useProfileCv ? 'true' : 'false');
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await adaptiveInterviewApi.startAssessment(formData);
      setCurrentAssessment(res);
      setActiveQuestion(res.active_question || null);
      setAnswerText('');
      setLastEvaluation(null);
      setShowFeedbackModal(false);
      setViewState('live');
    } catch (err: any) {
      console.error('Failed to start adaptive interview:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to start assessment. Please try again.');
    } finally {
      setSessionLoading(false);
    }
  };

  // Core Submit Answer Handler
  const submitAnswerDirect = async (ans: string) => {
    if (!currentAssessment || !activeQuestion) return;

    stopSpeechRecognition();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSubmitting(true);
    setAvatarMode('AI_EVALUATING');
    setErrorMessage('');

    try {
      const evalRes = await adaptiveInterviewApi.submitAnswer(
        currentAssessment.id,
        activeQuestion.index,
        ans.trim() || '[No answer provided within 30 seconds]'
      );

      setLastEvaluation(evalRes);
      setShowFeedbackModal(true);

      // Refresh full assessment state
      const updated = await adaptiveInterviewApi.getAssessment(currentAssessment.id);
      setCurrentAssessment(updated);

      if (evalRes.session_status === 'TERMINATED_EARLY' || evalRes.session_status === 'COMPLETED') {
        if (evalRes.summary_report) {
          setSummaryReport(evalRes.summary_report);
        }
      }

      // AI speaks brief evaluation feedback
      const feedbackPraise = evalRes.is_correct
        ? `Correct answer! Score: ${evalRes.score} out of 100.`
        : `That was incorrect. Score: ${evalRes.score} out of 100.`;
      speakText(`${feedbackPraise} ${evalRes.feedback || ''}`);
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to submit answer. Please try again.');
      setAvatarMode('WAITING_FOR_ANSWER');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Submit Answer Handler (Candidate clicks submit button)
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    await submitAnswerDirect(answerText.trim());
  };

  // Auto-move on 30s timeout
  const handleAutoTimeout = async () => {
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setErrorMessage('30 seconds elapsed without an answer. Automatically advancing to the next question...');
    await submitAnswerDirect('[No answer provided within 30 seconds]');
  };

  // Proceed to Next Question or Summary
  const handleProceedAfterEvaluation = () => {
    setShowFeedbackModal(false);
    setAnswerText('');
    setErrorMessage('');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (!lastEvaluation) return;

    if (
      lastEvaluation.session_status === 'TERMINATED_EARLY' ||
      lastEvaluation.session_status === 'COMPLETED'
    ) {
      if (lastEvaluation.summary_report) {
        setSummaryReport(lastEvaluation.summary_report);
      }
      setViewState('summary');
    } else if (lastEvaluation.next_question) {
      setActiveQuestion(lastEvaluation.next_question);
    }
  };

  // Conclude Early Manually
  const handleEndEarly = async () => {
    if (!currentAssessment) return;
    if (
      !window.confirm(
        'Are you sure you want to conclude the interview early? AI will synthesize your score based on answers submitted so far.'
      )
    ) {
      return;
    }

    try {
      const res = await adaptiveInterviewApi.endAssessment(currentAssessment.id);
      setCurrentAssessment(res);
      if (res.summary_report) {
        setSummaryReport(res.summary_report);
      }
      setViewState('summary');
    } catch (err: any) {
      alert('Failed to end assessment: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Fetch History Handler
  const handleOpenHistory = async () => {
    setHistoryLoading(true);
    try {
      const list = await adaptiveInterviewApi.getHistory();
      setHistoryList(list);
      setViewState('history');
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load Past Summary Handler
  const handleViewPastSummary = async (assessment: AssessmentResponse) => {
    if (assessment.summary_report) {
      setSummaryReport(assessment.summary_report);
      setCurrentAssessment(assessment);
      setViewState('summary');
    } else {
      try {
        const sum = await adaptiveInterviewApi.getSummary(assessment.id);
        setSummaryReport(sum);
        setCurrentAssessment(assessment);
        setViewState('summary');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Toggle question accordion in summary
  const toggleAccordion = (idx: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: SETUP & CONFIGURATION                                               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewState === 'setup' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Adaptive AI Interview Engine
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  CV-Based Adaptive AI Assessment
                </h1>
                <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
                  Upload your CV or use your existing profile. The AI dynamically generates customized
                  technical questions tailored to your background and tests your real depth in progressive adaptive rounds.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenHistory}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20 transition-all cursor-pointer whitespace-nowrap shadow-sm backdrop-blur-md"
              >
                <History className="w-4 h-4 text-indigo-300" />
                Past Assessments
              </button>
            </div>

            {/* Rules Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  Round 1: 5 Questions
                </div>
                <p className="text-xs text-slate-300">
                  Minimum <strong className="text-white">1 correct answer</strong> required out of 5, otherwise session terminates early.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Next Rounds: +2 Questions
                </div>
                <p className="text-xs text-slate-300">
                  Subsequent rounds unlock in pairs of 2. Answering at least 1 correctly unlocks the next 2.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
                  <Award className="w-4 h-4 text-amber-400" />
                  Max 20 Questions & Summary
                </div>
                <p className="text-xs text-slate-300">
                  Runs up to a maximum of 20 questions, delivering an exhaustive AI skill feedback report.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
            {/* 1. Job Category Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-600" />
                  Step 1: Select Target Job Category
                </label>
                <span className="text-xs text-slate-500">Tailors core interview domains</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {JOB_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-900">{cat.label}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">{cat.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interview Level Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Step 2: Choose Interview Seniority Level
                </label>
                <span className="text-xs text-slate-500">Adapts complexity & system design depth</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {INTERVIEW_LEVELS.map((lvl) => {
                  const isSelected = selectedLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-900">{lvl.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{lvl.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CV Upload / Profile CV Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Step 3: Select or Upload Candidate CV
                </label>
                <span className="text-xs text-slate-500">Questions are mapped directly from your real experience</span>
              </div>

              <div className="space-y-4">
                {hasProfileCv && (
                  <div
                    onClick={() => {
                      setUseProfileCv(true);
                      setSelectedFile(null);
                    }}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      useProfileCv && !selectedFile
                        ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          Use My Profile Resume
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            Detected
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{profileCvName}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        useProfileCv && !selectedFile
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {useProfileCv && !selectedFile && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                )}

                {/* File Upload Box */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    selectedFile
                      ? 'border-indigo-500 bg-indigo-50/30'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/40'
                  }`}
                >
                  <input
                    type="file"
                    id="cv-upload-input"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setUseProfileCv(false);
                      }
                    }}
                  />
                  <label htmlFor="cv-upload-input" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {selectedFile ? (
                      <div>
                        <span className="text-sm font-semibold text-indigo-700">
                          {selectedFile.name}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          Click to replace with a different PDF or Word document (Max 10MB)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm font-semibold text-indigo-600 hover:underline">
                          Upload new CV (PDF / DOCX)
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          Or drag and drop your updated resume here
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Launch Action Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Ready to assess: <strong className="text-slate-800">{selectedCategory}</strong> ({selectedLevel} Level)
              </div>

              <button
                type="button"
                onClick={handleStartAssessment}
                disabled={sessionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {sessionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Tailored Questions...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start AI Adaptive Interview
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: LIVE INTERVIEW SESSION (SPLIT-SCREEN VIDEO CALL & AI AVATAR)          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewState === 'live' && currentAssessment && activeQuestion && (
        <div className="space-y-5">
          {/* Top Session Status Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shadow-xs">
                Q{activeQuestion.index}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    Round {activeQuestion.round_number}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 font-semibold">
                    {currentAssessment.job_category} ({currentAssessment.interview_level})
                  </span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  Question {activeQuestion.index} of {currentAssessment.total_questions_asked}
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    (Adaptive • Max 20 Questions)
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Snapshot & Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-2 border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Passed: {currentAssessment.total_correct} / {activeQuestion.index - 1}</span>
              </div>

              <button
                type="button"
                onClick={handleEndEarly}
                className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Finish assessment now and view AI summary"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Finish Early</span>
              </button>
            </div>
          </div>

          {/* Alert / Notice Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          {/* MAIN 2-COLUMN SPLIT SCREEN: AI AVATAR (LEFT) & CANDIDATE VIDEO CALL (RIGHT) */}
          {/* ═══════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">

            {/* ═══════════════ LEFT: AI INTERVIEWER AVATAR ═══════════════ */}
            <div
              className={`relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/70 to-slate-900 border transition-all duration-500 flex flex-col justify-between p-6 sm:p-7 shadow-2xl min-h-[540px] ${
                avatarMode === 'AI_SPEAKING'
                  ? 'border-purple-500/80 ring-4 ring-purple-500/20 shadow-purple-900/30'
                  : 'border-slate-800 shadow-slate-950'
              }`}
            >
              {/* AI Top Info Bar */}
              <div className="flex items-center justify-between z-10 gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="font-extrabold text-xs text-white">Dr. Gemini AI</span>
                  <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.5 rounded">
                    Lead Technical Interviewer
                  </span>
                </div>

                {/* AI Status Badge */}
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    avatarMode === 'AI_SPEAKING'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-xs'
                      : avatarMode === 'AI_EVALUATING'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {avatarMode === 'AI_EVALUATING' ? (
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  ) : (
                    <Radio
                      className={`w-3.5 h-3.5 ${
                        avatarMode === 'AI_SPEAKING' ? 'text-purple-400 animate-pulse' : 'text-emerald-400'
                      }`}
                    />
                  )}
                  <span>
                    {avatarMode === 'AI_SPEAKING'
                      ? 'AI is speaking question...'
                      : avatarMode === 'AI_EVALUATING'
                      ? 'AI is analyzing your answer...'
                      : 'AI is listening to you'}
                  </span>
                </div>
              </div>

              {/* AI Hologram Orb Animation */}
              <div className="flex-1 flex flex-col items-center justify-center my-6 relative z-10">
                <div className="relative flex items-center justify-center">
                  {avatarMode === 'AI_SPEAKING' && (
                    <>
                      <div className="absolute w-56 h-56 rounded-full bg-purple-600/15 animate-ping duration-1000" />
                      <div className="absolute w-44 h-44 rounded-full bg-indigo-500/25 animate-pulse" />
                      <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 blur-xl opacity-60 animate-pulse" />
                    </>
                  )}

                  {avatarMode === 'AI_EVALUATING' && (
                    <div className="absolute w-44 h-44 rounded-full bg-amber-500/15 animate-ping duration-1000" />
                  )}

                  <div
                    className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-slate-950 via-purple-900 to-indigo-700 p-1 flex items-center justify-center shadow-2xl transition-transform duration-300 ${
                      avatarMode === 'AI_SPEAKING' ? 'scale-105 shadow-purple-500/40' : 'scale-100 shadow-slate-900'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-slate-950/90 flex flex-col items-center justify-center relative overflow-hidden border border-purple-400/30">
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 via-transparent to-indigo-500/20 animate-pulse" />
                      <Sparkles className="w-10 h-10 sm:w-14 sm:h-14 text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]" />
                      <span className="text-[9px] font-black text-indigo-200 tracking-widest uppercase mt-1">
                        Gemini Live AI
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Voice Waveform */}
                <div className="flex items-center gap-1.5 mt-6 h-8">
                  {avatarMode === 'AI_SPEAKING' ? (
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

              {/* Question Dialogue Box */}
              <div className="z-10 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase tracking-wider border border-purple-400/30">
                      Topic: {activeQuestion.topic}
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">
                      Q{activeQuestion.index} / {currentAssessment.total_questions_asked}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(activeQuestion.question)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 transition-colors cursor-pointer"
                    title="Re-play question voice"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
                  &ldquo;{activeQuestion.question}&rdquo;
                </p>
              </div>
            </div>

            {/* ═══════════════ RIGHT: CANDIDATE LIVE VIDEO CALL ═══════════════ */}
            <div
              className={`relative rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-500 flex flex-col justify-between p-6 sm:p-7 shadow-2xl min-h-[540px] ${
                avatarMode === 'CANDIDATE_SPEAKING'
                  ? 'border-emerald-500/80 ring-4 ring-emerald-500/20 shadow-emerald-950/40'
                  : 'border-slate-800 shadow-slate-950'
              }`}
            >
              {/* Candidate Live Camera Feed */}
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

              {/* Fallback Overlay if camera is paused or loading */}
              {(!cameraEnabled || !cameraStreamAvailable) && (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center z-0 p-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-slate-800/80 border-2 border-slate-700 flex items-center justify-center mb-3 text-slate-400 shadow-xl">
                    <User className="w-12 h-12" />
                  </div>
                  <span className="text-sm font-bold text-slate-300">{user?.full_name || 'Candidate'}</span>
                  <span className="text-xs text-slate-500 mt-1">
                    {!cameraEnabled ? 'Camera paused' : 'Connecting camera stream...'}
                  </span>
                </div>
              )}

              {/* Soft Vignette Overlay to ensure text and buttons remain crystal clear */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/80 z-[1] pointer-events-none" />

              {/* Candidate Top Header & 30-Second Countdown */}
              <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-extrabold text-xs text-white">{user?.full_name || 'You (Candidate)'}</span>
                  <span className="text-[10px] text-slate-400">Live Video</span>
                </div>

                {/* 30-Second Silence Auto-Advance Countdown Badge */}
                {avatarMode === 'WAITING_FOR_ANSWER' && !hasStartedAnsweringRef.current && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      silenceSeconds <= 10
                        ? 'bg-rose-500/25 text-rose-200 border-rose-500/50 animate-pulse shadow-md shadow-rose-900/30'
                        : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Answer starts within: {silenceSeconds}s</span>
                  </div>
                )}

                {avatarMode === 'CANDIDATE_SPEAKING' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 shadow-xs">
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Speaking Answer...</span>
                  </div>
                )}
              </div>

              {/* Floating Camera & Mic Toggles */}
              <div className="relative z-10 flex items-center justify-center gap-3 my-auto pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
                    cameraEnabled
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-600'
                      : 'bg-rose-600/90 hover:bg-rose-700 text-white border-rose-500 ring-2 ring-rose-500/30'
                  }`}
                  title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {cameraEnabled ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMicCapture}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
                    isRecording
                      ? 'bg-emerald-600/90 hover:bg-emerald-700 text-white border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-600'
                  }`}
                  title={isRecording ? 'Mute microphone' : 'Start microphone'}
                >
                  {isRecording ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>

              {/* Bottom: Spoken Technical Response & Submit Action */}
              <div className="relative z-10 space-y-3">
                <div className="bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live Speech Recognition & Answer
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {answerText.trim()
                        ? `${answerText.trim().split(/\s+/).filter(Boolean).length} words spoken`
                        : 'Speak naturally into microphone'}
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={answerText}
                    onChange={(e) => onAnswerTextChange(e.target.value)}
                    placeholder="Speak your answer into the microphone, or type/edit here..."
                    className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {silenceSeconds > 0 && !hasStartedAnsweringRef.current
                      ? `Auto-moves to next question if silent for ${silenceSeconds}s`
                      : 'Ready? Submit your technical answer.'}
                  </span>

                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmitting || !answerText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-900/40 transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Response</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Modal / Overlay for Immediate Answer Feedback ─────────────────── */}
          {showFeedbackModal && lastEvaluation && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {lastEvaluation.is_correct ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        {lastEvaluation.is_correct ? 'Correct Answer!' : 'Incorrect / Needs Improvement'}
                      </h3>
                      <div className="text-xs text-slate-500">
                        Score: <strong className="text-slate-800">{lastEvaluation.score}/100</strong>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      lastEvaluation.is_correct
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {lastEvaluation.is_correct ? 'Passed' : 'Missed'}
                  </span>
                </div>

                {/* AI Constructive Feedback */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <strong className="block text-slate-900 font-semibold mb-1">AI Evaluator Feedback:</strong>
                  {lastEvaluation.feedback}
                </div>

                {/* Reference Model Answer */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
                  <strong className="block text-indigo-900 font-semibold mb-1">Benchmark Model Answer:</strong>
                  {lastEvaluation.model_answer}
                </div>

                {/* Round Progress Alert */}
                {lastEvaluation.round_completed && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                      lastEvaluation.round_passed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {lastEvaluation.round_passed ? (
                      <>
                        <ThumbsUp className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Round Passed! You met the criteria. Unlocking next adaptive questions.
                        </span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Round Criteria Not Met: 0 correct answers in Round 1. Interview session will now conclude.
                        </span>
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProceedAfterEvaluation}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm transition-all cursor-pointer shadow-sm"
                >
                  {lastEvaluation.session_status === 'TERMINATED_EARLY' ||
                  lastEvaluation.session_status === 'COMPLETED'
                    ? 'View Comprehensive AI Summary'
                    : 'Proceed to Next Question'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: COMPREHENSIVE AI SUMMARY REPORT                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewState === 'summary' && summaryReport && currentAssessment && (
        <div className="space-y-6">
          {/* Header Summary Banner */}
          <div
            className={`rounded-2xl p-6 sm:p-8 text-white shadow-xl ${
              currentAssessment.status === 'TERMINATED_EARLY'
                ? 'bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900'
                : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20">
                <Award className="w-3.5 h-3.5" />
                Adaptive Assessment Summary Report
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentAssessment.status === 'TERMINATED_EARLY'
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                }`}
              >
                {summaryReport.performance_tier}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold">{summaryReport.verdict}</h1>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              {summaryReport.summary_narrative}
            </p>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="text-xs text-slate-400">Total Questions</div>
                <div className="text-2xl font-bold mt-1">{summaryReport.total_questions}</div>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="text-xs text-slate-400">Correct Answers</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {summaryReport.total_correct}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="text-xs text-slate-400">Accuracy Rate</div>
                <div className="text-2xl font-bold mt-1">{summaryReport.accuracy_percentage}%</div>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <div className="text-xs text-slate-400">Rounds Attempted</div>
                <div className="text-2xl font-bold text-indigo-300 mt-1">
                  {currentAssessment.current_round}
                </div>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Demonstrated Strengths
              </h3>
              <ul className="space-y-2.5">
                {summaryReport.strengths.map((str, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Areas */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Areas for Technical Improvement
              </h3>
              <ul className="space-y-2.5">
                {summaryReport.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Question-by-Question Breakdown Accordion */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Question-by-Question Detailed Review
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Expand each question to see your answer, AI score, feedback, and reference answers
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {currentAssessment.rounds.flatMap((r) => r.questions).map((q) => {
                const isExpanded = !!expandedQuestions[q.index];
                return (
                  <div
                    key={q.index}
                    className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion(q.index)}
                      className="w-full p-4 text-left bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between gap-4 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            q.is_correct
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {q.index}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                            {q.question}
                          </div>
                          <span className="text-[11px] text-slate-500">{q.topic}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            q.is_correct
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {q.is_correct ? 'Correct' : 'Incorrect'} ({q.score ?? 0}%)
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-5 bg-white space-y-4 border-t border-slate-200 text-xs text-slate-700">
                        <div>
                          <strong className="block text-slate-900 font-semibold mb-1">
                            Full Question:
                          </strong>
                          <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                            {q.question}
                          </p>
                        </div>

                        <div>
                          <strong className="block text-slate-900 font-semibold mb-1">
                            Your Answer:
                          </strong>
                          <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800">
                            {q.candidate_answer || 'No answer submitted.'}
                          </p>
                        </div>

                        <div>
                          <strong className="block text-slate-900 font-semibold mb-1">
                            AI Constructive Feedback:
                          </strong>
                          <p className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-indigo-950">
                            {q.feedback || 'Evaluated.'}
                          </p>
                        </div>

                        <div>
                          <strong className="block text-slate-900 font-semibold mb-1">
                            Benchmark Reference Model Answer:
                          </strong>
                          <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600">
                            {q.model_answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
            >
              View Assessment History
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentAssessment(null);
                setActiveQuestion(null);
                setSummaryReport(null);
                setViewState('setup');
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Take Another Adaptive Assessment
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: ASSESSMENT HISTORY                                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewState === 'history' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Your Adaptive Assessment History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review past practice interview attempts and track your skill growth
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewState('setup')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              Back to Assessment
            </button>
          </div>

          {historyLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading history...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No previous adaptive assessments found. Start your first session!
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-900">
                        {item.job_category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {item.interview_level}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'TERMINATED_EARLY'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>
                        Answered {item.total_correct} / {item.total_questions_asked} Correct
                      </span>
                      <span>•</span>
                      <span>{item.current_round} Rounds</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewPastSummary(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    View Report
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
