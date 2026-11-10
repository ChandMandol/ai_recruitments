import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import { evaluationsApi, type GeminiConfig } from '../../api/evaluations';

export const AdminSettings: React.FC = () => {
  // Company Tenant
  const [companyName, setCompanyName] = useState('TechVentures SaaS Global');
  const [domain, setDomain] = useState('techventures.recruitmenthub.ai');
  const [aiName, setAiName] = useState('Gemini Hiring Agent');
  const [aiTone, setAiTone] = useState('BALANCED');
  const [defaultDuration, setDefaultDuration] = useState('30');

  // Gemini API Key config
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [savingKey, setSavingKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    reply?: string;
  } | null>(null);

  // Global Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchGeminiConfig = async () => {
    setLoadingConfig(true);
    try {
      const data = await evaluationsApi.getGeminiConfig();
      setGeminiConfig(data);
      if (data.model) setSelectedModel(data.model);
    } catch {
      // Ignored
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchGeminiConfig();
  }, []);

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setAlert({ type: 'error', message: 'Please enter a valid Gemini API Key.' });
      return;
    }

    setSavingKey(true);
    setTestResult(null);
    try {
      const updated = await evaluationsApi.updateGeminiConfig(apiKeyInput.trim(), selectedModel);
      setGeminiConfig(updated);
      setApiKeyInput('');
      setAlert({
        type: 'success',
        message: 'Google Gemini API Key securely saved and active in PostgreSQL!',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update Gemini API Key.',
      });
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await evaluationsApi.testGeminiConnection();
      setTestResult(res);
      if (res.success) {
        setAlert({
          type: 'success',
          message: 'Gemini API connection test succeeded! Google Gemini 2.0 Flash is ready for screening.',
        });
      } else {
        setAlert({
          type: 'error',
          message: `Gemini API test failed: ${res.message}`,
        });
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to test Gemini connection.',
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleClearKey = async () => {
    try {
      await evaluationsApi.clearGeminiConfig();
      setTestResult(null);
      setAlert({
        type: 'success',
        message: 'Database key cleared. Reverted to backend environment variables.',
      });
      fetchGeminiConfig();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to clear key.',
      });
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn pb-16">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>Platform & Google Gemini AI Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure Google Gemini AI credentials, multi-tenant company details, and AI screening parameters.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* 1. Google Gemini API Key Management Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Google Gemini API Configuration
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Powers AI CV Analysis, Match Scoring, and Live AI Interview Engine.
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {loadingConfig ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : geminiConfig?.has_api_key ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active ({geminiConfig.key_source === 'DATABASE' ? 'Custom Admin Key' : 'Vercel / Env Var'})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Key className="w-3.5 h-3.5" />
              <span>No API Key Configured</span>
            </span>
          )}
        </div>

        {/* Security & Masked Key Information */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Active Key Status:</span>
            </span>
            <span className="font-mono text-slate-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {geminiConfig?.masked_key || 'No key set'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Security Guarantee:</strong> API keys are never exposed in frontend code. You can provide your key directly via the dashboard below or use Vercel environment variables (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">GEMINI_API_KEY</code>).
          </p>
        </div>

        {/* Form to Set / Replace Key */}
        <form onSubmit={handleSaveGeminiKey} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Enter New Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Gemini Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingKey || !geminiConfig?.has_api_key}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                {testingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test API Connection</span>
              </button>

              {geminiConfig?.key_source === 'DATABASE' && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear DB Key</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={savingKey || !apiKeyInput.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            >
              {savingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Activate Key</span>
            </button>
          </div>
        </form>

        {/* Live Test Ping Result Box */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs ${
              testResult.success
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>{testResult.message}</span>
            </div>
            {testResult.reply && (
              <div className="font-mono text-[11px] mt-1 pl-6 text-slate-700">
                Model Response: "{testResult.reply}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Tenant Profile & Organization */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
          <Building2 className="w-4 h-4 text-purple-600" />
          <span>Tenant Organization Settings</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Custom Domain / Tenant Subdomain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              AI Interviewer Persona Name
            </label>
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Interview Evaluation Tone
            </label>
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="BALANCED">Balanced & Encouraging</option>
              <option value="STRICT">Strict Technical Rigor</option>
              <option value="CONVERSATIONAL">Conversational & Soft-skills focused</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Default Interview Duration (Mins)
            </label>
            <input
              type="number"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
