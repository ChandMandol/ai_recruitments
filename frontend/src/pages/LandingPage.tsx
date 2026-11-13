import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Mic,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
  Volume2,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateLogin: (role?: 'CANDIDATE' | 'ADMIN') => void;
  onNavigateRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateLogin,
  onNavigateRegister,
}) => {
  const [activeSystemTab, setActiveSystemTab] = useState<'practice' | 'hiring'>('practice');
  const [previewAvatarId, setPreviewAvatarId] = useState<'female' | 'male'>('female');
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Toggle demo voice playback simulation
  const handleToggleSimulation = () => {
    setIsSimulatingVoice(!isSimulatingVoice);
  };

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* BACKGROUND MESH & AMBIENT GLOWS                                        */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/15 to-pink-600/10 blur-[140px] rounded-full pointer-events-none animate-glow" />
      <div className="absolute top-96 -left-48 w-96 h-96 bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-96 -right-48 w-96 h-96 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION: Dual-Arena Career Hub                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-10 pb-20 sm:pt-16 sm:pb-28 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md shadow-lg shadow-indigo-500/10 text-xs font-bold text-indigo-300 animate-float">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Career Arena 2.0 • Zero-Judgment Practice + Live Company Simulators</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.12] text-white">
              Never walk into a job interview{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                unprepared again.
              </span>
            </h1>

            {/* Subheading (Bilingual / Human-Centric) */}
            <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              শিক্ষার্থী ও চাকরিপ্রার্থীদের জন্য তৈরি: একা একা কথা বলা AI ইন্টারভিউয়ারের সাথে অনুশীলন করে জড়তা কাটান, কিংবা সিমুলেটেড জব চ্যালেঞ্জে সহপাঠীদের সাথে প্রতিযোগিতা করে জানুন অন্যদের তুলনায় আপনার আসল অবস্থান।
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={onNavigateRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 group hover:scale-[1.02] active:scale-[0.98]"
              >
                <GraduationCap className="w-5 h-5 text-indigo-200" />
                <span>Start Solo AI Practice (একক অনুশীলন)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateLogin('CANDIDATE')}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700/80 hover:border-purple-500/50 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/40"
              >
                <Trophy className="w-4 h-4 text-purple-400" />
                <span>Join Job Arena (মেধা প্রতিযোগিতা)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateLogin('ADMIN')}
                className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-semibold text-xs border border-white/10 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>System Admin</span>
              </button>
            </div>

            {/* Trust Markers */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400 font-semibold">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>100% Judgment-Free Practice</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>3-Strike Anti-Cheating Shield</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Ranked Peer Leaderboard</span>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* INTERACTIVE VIDEO CALL & ACCURACY PREVIEW WIDGET                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl p-3 sm:p-5 bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl relative">
            {/* Floating Metric 1 */}
            <div className="absolute -top-5 -left-4 sm:-left-6 hidden md:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-indigo-500/40 shadow-xl backdrop-blur-md text-xs animate-float">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Cohort Ranking</span>
                <span className="font-extrabold text-white text-xs">Top 5% Peer Benchmark</span>
              </div>
            </div>

            {/* Floating Metric 2 */}
            <div className="absolute -bottom-5 -right-4 sm:-right-6 hidden md:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl backdrop-blur-md text-xs animate-float-delayed">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Proctoring Guard</span>
                <span className="font-extrabold text-emerald-400 text-xs">Tab Switch Protection Active</span>
              </div>
            </div>

            {/* Window Top Bar */}
            <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-slate-800 mb-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">
                  Interactive AI Interview Room • Turn 2 of 5
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleSimulation}
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {isSimulatingVoice ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isSimulatingVoice ? 'Reset Simulator' : 'Test Live Voice Demo'}</span>
                </button>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>LIVE</span>
                </div>
              </div>
            </div>

            {/* Split Screen Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Speaking AI Interviewer Avatar */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-purple-500/40 p-4 relative flex flex-col justify-between shadow-xl min-h-[340px]">
                <div className="flex flex-wrap items-center justify-between gap-2 z-10">
                  <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-700/80 text-xs">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <span className="font-extrabold text-white text-[11px]">
                      {previewAvatarId === 'female' ? 'Sarah Chen' : 'Alex Mercer'}
                    </span>
                    <span className="text-[10px] text-purple-300 font-semibold hidden sm:inline">
                      {previewAvatarId === 'female' ? 'Lead Technical Interviewer' : 'Engineering Manager'}
                    </span>
                  </div>

                  {/* Avatar Switcher */}
                  <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewAvatarId('female')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        previewAvatarId === 'female'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewAvatarId('male')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        previewAvatarId === 'male'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Male
                    </button>
                  </div>
                </div>

                {/* Avatar Portrait with Live Waveform */}
                <div className="my-4 relative flex items-center justify-center">
                  <div className="w-48 h-36 sm:w-52 sm:h-40 rounded-2xl overflow-hidden border-2 border-purple-400/80 ring-4 ring-purple-500/20 shadow-2xl bg-slate-900 relative">
                    <img
                      src={previewAvatarId === 'female' ? '/avatars/avatar-female.png' : '/avatars/avatar-male.jpg'}
                      alt={previewAvatarId === 'female' ? 'Sarah Chen' : 'Alex Mercer'}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-200">
                        {previewAvatarId === 'female' ? 'Sarah Chen (Speaking)' : 'Alex Mercer (Speaking)'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-3.5 bg-purple-400 rounded-full animate-wave-1" />
                        <span className="w-1 h-5 bg-purple-400 rounded-full animate-wave-3" />
                        <span className="w-1 h-2.5 bg-purple-400 rounded-full animate-wave-2" />
                        <span className="w-1 h-4 bg-purple-400 rounded-full animate-wave-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Prompt Box */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold">
                    <span>TOPIC: SYSTEM ARCHITECTURE & REACT OPTIMIZATION</span>
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-semibold text-white text-xs leading-relaxed">
                    &ldquo;How does React&apos;s virtual DOM reconciliation algorithm work under high concurrency, and how would you optimize render performance?&rdquo;
                  </p>
                </div>
              </div>

              {/* Right Column: Candidate Stream & Real-time Speech Transcription */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-emerald-500/40 p-4 relative flex flex-col justify-between shadow-xl min-h-[340px]">
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-700/80 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-extrabold text-white text-[11px]">Candidate (You)</span>
                    <span className="text-[10px] text-slate-400">Webcam Verified</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                    <Mic className="w-3 h-3 animate-pulse" />
                    <span>Live Audio Input</span>
                  </div>
                </div>

                <div className="my-4 relative flex items-center justify-center">
                  <div className="w-48 h-36 rounded-2xl overflow-hidden border-2 border-emerald-400/80 bg-slate-900 flex flex-col items-center justify-center text-slate-400 relative">
                    <Video className="w-8 h-8 text-emerald-400 mb-2" />
                    <span className="text-[11px] font-bold text-slate-200">Candidate Video Stream</span>
                    <span className="text-[9px] text-slate-400">Microphone & Speech-to-Text Active</span>

                    {/* Instant Feedback Overlay */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 font-mono font-bold text-[9px] border border-emerald-400/40">
                      ✓ 94% Match
                    </div>
                  </div>
                </div>

                {/* Candidate Live Speech Subtitles */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                    <span>LIVE SPEECH-TO-TEXT TRANSCRIPT</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Auto-Submits on Speech Finish
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono italic leading-relaxed">
                    &ldquo;React creates an in-memory virtual DOM tree and uses Fiber reconciler to prioritize tasks, applying minimal patches to the real DOM...&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. THE DUAL ENGINES: Two Complete Systems in One Platform               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-950/95 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
              Two Competitive Learning Arenas
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              আমাদের প্ল্যাটফর্মে রয়েছে ২টি পৃথক প্রতিযোগিতামূলক এরিনা
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              একটি হলো <strong>নিজের সাথে নিজের প্রতিযোগিতা (Individual Self-Improvement)</strong> এবং অন্যটি হলো <strong>সবার সাথে মেধার প্রতিযোগিতা (Cohort Job Arena & Peer Benchmarking)</strong>।
            </p>

            {/* Interactive Switcher Pill */}
            <div className="pt-4 inline-flex p-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl">
              <button
                type="button"
                onClick={() => setActiveSystemTab('practice')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                  activeSystemTab === 'practice'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>সিস্টেম ০১: একক আত্ম-উন্নয়ন (Solo Practice)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSystemTab('hiring')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                  activeSystemTab === 'hiring'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>সিস্টেম ০২: সবার সাথে প্রতিযোগিতা (Job Arena)</span>
              </button>
            </div>
          </div>

          {/* Deep Dive into Both Systems */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* System 1 Card: Solo Practice */}
            <div
              className={`rounded-3xl p-8 border transition-all duration-300 flex flex-col justify-between ${
                activeSystemTab === 'practice'
                  ? 'bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 border-indigo-500/70 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold">
                    <Target className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    সিস্টেম ০১ • নিজের সাথে নিজের প্রতিযোগিতা
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">
                    Solo AI Practice & Self-Diagnostic
                  </h3>
                  <p className="text-xs text-indigo-300 font-semibold mt-1">
                    কার জন্য: শিক্ষার্থী, ফ্রেশ গ্র্যাজুয়েট ও চাকরিপ্রার্থীদের নিজস্ব একক প্রস্তুতি
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  এখানে কেউ আপনাকে দেখছে না, নেই কোনো রিজেকশনের ভয় বা লজ্জা। সম্পূর্ণ নিজের সিভিতে থাকা টেকনোলজির ওপর কথা বলা AI অ্যাভাটারের সাথে আনলিমিটেড মক ইন্টারভিউ দিন। বারবার ভুল করুন, AI-এর ফিডব্যাক ও মডেল উত্তর দেখে জড়তা কাটিয়ে নিজের স্কোর প্রতিনিয়ত বাড়ান।
                </p>

                {/* Feature Checklist */}
                <div className="space-y-3 pt-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>নিজের সিভি থেকে অ্যাডাপ্টিভ প্রশ্ন:</strong> সিভিতে থাকা টেকনোলজির ভিত্তিতে ৫টি থেকে ২০টি অ্যাডাপ্টিভ প্রশ্ন।</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>মুখোমুখি স্প্লিট-স্ক্রিন ভিডিও:</strong> কথা বলা এআই অ্যাভাটার ও আপনার লাইভ ওয়েবক্যাম।</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>তাৎক্ষণিক ফিডব্যাক ও মডেল উত্তর:</strong> প্রতিটি উত্তরের জন্য সঠিকতার শতকরা হার (% Match) ও রিক্রুটারের আদর্শ উত্তর।</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>জিরো প্রেসার ও জাজমেন্ট-মুক্ত:</strong> যতবার খুশি টেস্ট দিয়ে জড়তা দূর করুন।</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Solo AI Practice (Free)</span>
                </button>
              </div>
            </div>

            {/* System 2 Card: Competitive Hiring Arena */}
            <div
              className={`rounded-3xl p-8 border transition-all duration-300 flex flex-col justify-between ${
                activeSystemTab === 'hiring'
                  ? 'bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 border-purple-500/70 shadow-2xl shadow-purple-500/10 ring-1 ring-purple-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    সিস্টেম ০২ • সবার সাথে মেধার প্রতিযোগিতা
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">
                    Simulated Job Arena & Peer Benchmarking
                  </h3>
                  <p className="text-xs text-purple-300 font-semibold mt-1">
                    কার জন্য: বাস্তব কোম্পানির আদলে তৈরি চ্যালেঞ্জে অন্যদের সাথে মেধার তুলনা
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  বাস্তব কোম্পানির আদলে সিস্টেম বা অ্যাডমিন থেকে ওপেন জব পোস্ট প্রকাশ করা হয়। আপনার মতো শত শত প্রার্থী আবেদন করে এবং AI সবার ইন্টারভিউ নেয়। এরপর AI তুলনামূলক রেজাল্ট ও মেধা তালিকা দেয়—যাতে আপনি স্পষ্টভাবে দেখতে পারেন সবার সাথে আপনার পার্থক্য ও মেধার অবস্থান কোথায়!
                </p>

                {/* Feature Checklist */}
                <div className="space-y-3 pt-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>বাস্তবধর্মী জব সার্কুলার:</strong> টপ কোম্পানির আদলে তৈরি জবে সরাসরি আবেদন।</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>অভিন্ন স্ট্যান্ডার্ডে AI ইন্টারভিউ:</strong> সকল আবেদনকারীর জন্য নিরপেক্ষ প্রক্টরেড পরীক্ষা।</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>৩-স্ট্রাইক অ্যান্টি-চিটিং প্রক্টরিং:</strong> ট্যাব পরিবর্তন ও প্রক্টরিং সিকিউরিটি শিল্ড।</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>মেধা তালিকা ও গ্যাপ অ্যানালাইসিস:</strong> আপনি কি Top 5%, 15% নাকি 50% ব্র্যাকেটে আছেন তার স্পষ্ট রিপোর্ট।</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateLogin('CANDIDATE')}
                  className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Enter Job Arena & Compete</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateLogin('ADMIN')}
                  className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Post Job Challenge</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 3. TRADITIONAL VS AI RECRUITMENT HUB COMPARISON                        */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-900/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              The Real Difference
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              কেন গতানুগতিক মক ইন্টারভিউয়ের চেয়ে এটি শতগুণ কার্যকর?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Old Way */}
            <div className="p-7 rounded-3xl bg-slate-950/80 border border-rose-900/40 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                <span>✕</span>
                <span>গতানুগতিক মক ইন্টারভিউ (Old Approach)</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>সিনিয়রদের শিডিউল মেলানোর ঝামেলা ও অতিরিক্ত খরচ।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>মানুষের সামনে লজ্জা, জড়তা বা জাজমেন্টের মানসিক চাপ।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>ফিডব্যাক পেতে কয়েকদিন অপেক্ষা করতে হয় এবং বিস্তারিত পয়েন্ট থাকে না।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>অন্যান্য আবেদনকারীদের তুলনায় আপনি কোথায় দাঁড়িয়ে তা জানা যায় না।</span>
                </li>
              </ul>
            </div>

            {/* AI Recruitment Hub Way */}
            <div className="p-7 rounded-3xl bg-gradient-to-b from-indigo-950/40 to-slate-950 border border-emerald-500/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                <span>✓</span>
                <span>AI Recruitment Hub (আমাদের প্ল্যাটফর্ম)</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>সম্পূর্ণ ফ্রি, ইনস্ট্যান্ট এবং ২৪/৭ যেকোনো সময় অনুশীলন করা যায়।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>১০০% জাজমেন্ট-মুক্ত: বারবার ভুল করে নিজেকে পারফেক্ট করার স্বাধীনতা।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>তাৎক্ষণিক মডেল উত্তর ও প্রতিটি টেকনিক্যাল পয়েন্টের % Match স্কোর।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>বাস্তব জব অ্যারেনায় শত শত প্রার্থীর সাথে তুলনামূলক র‍্যাংকিং ও পার্সেন্টাইল।</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4. DUAL AI AVATARS SPOTLIGHT                                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Interactive AI Interviewers
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              আপনার সাথে কথা বলবে বাস্তবসম্মত এআই অ্যাভাটার
            </h2>
            <p className="text-sm text-slate-400">
              প্র্যাকটিস ও রিয়েল ইন্টারভিউ—উভয় ক্ষেত্রেই আপনি পছন্দমতো ইন্টারভিউয়ার বেছে নিতে পারেন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Sarah Chen (Female Avatar) */}
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-xl flex flex-col sm:flex-row items-center gap-6 group hover:border-purple-500/60 transition-all">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 border-2 border-purple-400/80 shadow-lg relative bg-slate-900">
                <img
                  src="/avatars/avatar-female.png"
                  alt="Sarah Chen"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div className="text-center sm:text-left space-y-2">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase tracking-wider border border-purple-500/30">
                  Female Interviewer
                </div>
                <h3 className="text-xl font-bold text-white">Sarah Chen</h3>
                <p className="text-xs font-semibold text-purple-400">Lead AI Technical Interviewer</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Frontend, Modern Full-Stack Architecture, Algorithms, React ও প্রবলেম সলভিং সম্পর্কিত দক্ষতায় গভীর টেকনিক্যাল প্রশ্ন করে।
                </p>
              </div>
            </div>

            {/* Alex Mercer (Male Avatar) */}
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-xl flex flex-col sm:flex-row items-center gap-6 group hover:border-indigo-500/60 transition-all">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 border-2 border-indigo-400/80 shadow-lg relative bg-slate-900">
                <img
                  src="/avatars/avatar-male.jpg"
                  alt="Alex Mercer"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div className="text-center sm:text-left space-y-2">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider border border-indigo-500/30">
                  Male Interviewer
                </div>
                <h3 className="text-xl font-bold text-white">Alex Mercer</h3>
                <p className="text-xs font-semibold text-indigo-400">Senior Engineering Manager</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Backend, Cloud Infrastructure, Database Design, Scalability ও ইঞ্জিনিয়ারিং লিডারশিপ নিয়ে ইন্টারভিউ পরিচালনা করে।
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 5. METRICS & IMPACT STATS                                              */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-slate-950/80 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-3xl sm:text-4xl font-black text-white block">15,000+</span>
              <span className="text-xs text-slate-400 mt-1 block">মক প্রশ্ন প্র্যাকটিস</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-3xl sm:text-4xl font-black text-indigo-400 block">40+</span>
              <span className="text-xs text-slate-400 mt-1 block">ইঞ্জিনিয়ারিং রোল ও ডোমেইন</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 block">94%</span>
              <span className="text-xs text-slate-400 mt-1 block">আত্মবিশ্বাস বৃদ্ধির হার</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-3xl sm:text-4xl font-black text-purple-400 block">&lt; 2s</span>
              <span className="text-xs text-slate-400 mt-1 block">লাইভ স্পিচ লেটেন্সি</span>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 6. FAQ ACCORDION SECTION                                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Questions & Answers
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">
              সাধারণ জিজ্ঞাসা (Frequently Asked Questions)
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'প্ল্যাটফর্মটি কি সত্যি সম্পূর্ণ ফ্রি?',
                a: 'হ্যাঁ! শিক্ষার্থী এবং চাকরিপ্রার্থীদের জন্য ইন্ডিভিজুয়াল প্র্যাকটিস এবং জব অ্যারেনায় অংশগ্রহণ সম্পূর্ণ ফ্রি। যেকোনো শিক্ষার্থী তার সিভি আপলোড করে যতবার খুশি মক ইন্টারভিউ দিতে পারবে।',
              },
              {
                q: 'আমার প্র্যাকটিস রেজাল্ট কি অন্যরা দেখতে পাবে?',
                a: 'না। সিস্টেম ০১ (Solo Practice)-এর সমস্ত অডিও, ট্রান্সক্রিপ্ট এবং স্কোর সম্পূর্ণ ব্যক্তিগত। সেখানে কোনো রিজেকশনের ভয় নেই। তবে সিস্টেম ০২ (Job Arena)-তে আপনি সহপাঠীদের সাথে র‍্যাংকিং দেখতে পারবেন।',
              },
              {
                q: 'ইন্টারভিউতে ৩-স্ট্রাইক অ্যান্টি-চিটিং কীভাবে কাজ করে?',
                a: 'ইন্টারভিউ চলাকালীন কোনো প্রার্থী যদি ব্রাউজারের অন্য ট্যাবে গিয়ে গুগল বা চ্যাটজিপিটি করার চেষ্টা করে, সিস্টেম স্বয়ংক্রিয়ভাবে একটি ওয়ার্নিং দেয়। ৩ বার বেশি ট্যাব পরিবর্তন করলে ইন্টারভিউ স্বয়ংক্রিয়ভাবে সাবমিট ও ফ্ল্যাগ হয়ে যায়।',
              },
              {
                q: 'অ্যাডমিন কীভাবে প্রশ্ন ও মডেল উত্তর ইনপুট দিতে পারে?',
                a: 'অ্যাডমিন ড্যাশবোর্ডে Job Management সেকশনে যেকোনো জব তৈরি বা এডিট করার সময় নির্দিষ্ট টেকনিক্যাল প্রশ্ন এবং তার প্রত্যাশিত আদর্শ উত্তর ইনপুট দিয়ে রাখতে পারে। AI প্রার্থীর উত্তরের সাথে সেই মডেল উত্তরের শতকরা মিল (% Match) হিসাব করে মূল্যায়ন করে।',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-950/80 border border-slate-800/80 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50 transition-colors"
                >
                  <span className="font-bold text-sm text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${
                      activeFaq === idx ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 7. CALL TO ACTION BANNER                                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>প্র্যাকটিস শুরু করুন অথবা জবে আবেদন করুন</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            আজই নিজের দক্ষতা যাচাই করুন
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            কোনো দ্বিধা বা ভয় নয়—একা একা নিজের স্কিল ঝালিয়ে নিন অথবা রিয়েল চাকরির সার্কুলারে আবেদন করে অন্যদের চেয়ে এগিয়ে থাকুন।
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onNavigateRegister}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateLogin('CANDIDATE')}
              className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700 transition-all cursor-pointer"
            >
              Sign In to Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 8. FOOTER                                                              */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-300">AI Recruitment & Career Hub</span>
            <span>• Dual-Arena AI Career Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
            <span>&copy; {new Date().getFullYear()} AI Recruitment Hub. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
