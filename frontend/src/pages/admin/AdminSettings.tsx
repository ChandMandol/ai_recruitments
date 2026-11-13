import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import {
  evaluationsApi,
  type CloudinaryConfig,
  type GeminiConfig,
  type SmtpConfig,
} from '../../api/evaluations';

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

  // Gmail SMTP Dispatcher Config
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [loadingSmtp, setLoadingSmtp] = useState(true);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpFromName, setSmtpFromName] = useState('AI Recruitment Hub');
  const [smtpIsEnabled, setSmtpIsEnabled] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [showAppPasswordGuide, setShowAppPasswordGuide] = useState(false);

  // SMTP Test Email
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Cloudinary Cloud Storage Config
  const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig | null>(null);
  const [loadingCloudinary, setLoadingCloudinary] = useState(true);
  const [cloudName, setCloudName] = useState('');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('');
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);
  const [cloudinaryIsEnabled, setCloudinaryIsEnabled] = useState(true);
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [testingCloudinary, setTestingCloudinary] = useState(false);
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState<{
    success: boolean;
    message: string;
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

  const fetchSmtpConfig = async () => {
    setLoadingSmtp(true);
    try {
      const data = await evaluationsApi.getSmtpConfig();
      setSmtpConfig(data);
      setSmtpHost(data.host || 'smtp.gmail.com');
      setSmtpPort(data.port || 587);
      setSmtpUser(data.user || '');
      setSmtpFromName(data.from_name || 'AI Recruitment Hub');
      setSmtpIsEnabled(data.is_enabled);
    } catch {
      // Ignored
    } finally {
      setLoadingSmtp(false);
    }
  };

  const fetchCloudinaryConfig = async () => {
    setLoadingCloudinary(true);
    try {
      const data = await evaluationsApi.getCloudinaryConfig();
      setCloudinaryConfig(data);
      setCloudName(data.cloud_name || '');
      setCloudinaryApiKey(data.api_key || '');
      setCloudinaryIsEnabled(data.is_enabled);
    } catch {
      // Ignored
    } finally {
      setLoadingCloudinary(false);
    }
  };

  useEffect(() => {
    fetchGeminiConfig();
    fetchSmtpConfig();
    fetchCloudinaryConfig();
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

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpUser.trim()) {
      setAlert({ type: 'error', message: 'Please provide a valid Gmail / SMTP email address.' });
      return;
    }

    setSavingSmtp(true);
    setSmtpTestResult(null);
    try {
      const updated = await evaluationsApi.updateSmtpConfig({
        host: smtpHost.trim(),
        port: Number(smtpPort) || 587,
        user: smtpUser.trim(),
        password: smtpPassword.trim() || undefined,
        from_name: smtpFromName.trim(),
        is_enabled: smtpIsEnabled,
      });
      setSmtpConfig(updated);
      setSmtpPassword('');
      setAlert({
        type: 'success',
        message: 'Gmail SMTP configuration saved successfully! Email notifications are active.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update SMTP settings.',
      });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testRecipientEmail.trim()) {
      setAlert({ type: 'error', message: 'Please enter a test recipient email address.' });
      return;
    }

    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await evaluationsApi.testSmtpConnection(testRecipientEmail.trim());
      setSmtpTestResult(res);
      if (res.success) {
        setAlert({
          type: 'success',
          message: res.message,
        });
      } else {
        setAlert({
          type: 'error',
          message: res.message,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to dispatch test email.';
      setSmtpTestResult({ success: false, message: msg });
      setAlert({ type: 'error', message: msg });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveCloudinary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudName.trim() || !cloudinaryApiKey.trim()) {
      setAlert({ type: 'error', message: 'Please provide both Cloud Name and API Key.' });
      return;
    }

    setSavingCloudinary(true);
    setCloudinaryTestResult(null);
    try {
      const updated = await evaluationsApi.updateCloudinaryConfig({
        cloud_name: cloudName.trim(),
        api_key: cloudinaryApiKey.trim(),
        api_secret: cloudinaryApiSecret.trim() || undefined,
        is_enabled: cloudinaryIsEnabled,
      });
      setCloudinaryConfig(updated);
      setCloudinaryApiSecret('');
      setAlert({
        type: 'success',
        message: 'Cloudinary persistent cloud storage configuration saved successfully!',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update Cloudinary settings.',
      });
    } finally {
      setSavingCloudinary(false);
    }
  };

  const handleTestCloudinary = async () => {
    setTestingCloudinary(true);
    setCloudinaryTestResult(null);
    try {
      const res = await evaluationsApi.testCloudinaryConnection();
      setCloudinaryTestResult(res);
      if (res.success) {
        setAlert({
          type: 'success',
          message: res.message,
        });
      } else {
        setAlert({
          type: 'error',
          message: res.message,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to ping Cloudinary API.';
      setCloudinaryTestResult({ success: false, message: msg });
      setAlert({ type: 'error', message: msg });
    } finally {
      setTestingCloudinary(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn pb-16">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>Platform & Integration Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure Google Gemini AI credentials, Gmail SMTP email notification dispatcher, and organization defaults.
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

      {/* 2. Gmail SMTP & Email Dispatcher Configuration Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span>Gmail SMTP Email Dispatcher</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  Real-time Alerts
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sends automated calendar invitations for scheduled interviews & outcome verdict emails to candidates.
              </p>
            </div>
          </div>

          {/* SMTP Status Badge */}
          {loadingSmtp ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : smtpConfig?.status.includes('Operational') ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{smtpConfig.status}</span>
            </span>
          ) : !smtpConfig?.is_enabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <span>Email Dispatch Disabled</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{smtpConfig?.status || 'Setup Required'}</span>
            </span>
          )}
        </div>

        {/* Instructions & App Password Guide Box */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>How to configure Gmail SMTP (Google App Password)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAppPasswordGuide(!showAppPasswordGuide)}
              className="text-blue-700 hover:text-blue-900 font-bold text-[11px] underline cursor-pointer"
            >
              {showAppPasswordGuide ? 'Hide Guide' : 'Show Instructions'}
            </button>
          </div>

          {showAppPasswordGuide && (
            <div className="pt-2 text-[11px] text-slate-700 leading-relaxed border-t border-blue-200/60 space-y-1.5">
              <p>For security, Google requires an <strong>App Password</strong> rather than your standard Gmail account password:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Account Security</a>.</li>
                <li>Make sure <strong>2-Step Verification</strong> is turned ON.</li>
                <li>Search or select <strong>App passwords</strong>.</li>
                <li>Enter an app name like <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">AI Recruitment Hub</code> and click <strong>Create</strong>.</li>
                <li>Copy the 16-character generated password and paste it into the <em>Gmail App Password</em> field below.</li>
              </ol>
            </div>
          )}

          {smtpConfig?.has_password && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-600 font-medium">Saved App Password:</span>
              <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-950">
                {smtpConfig.masked_password || '••••••••'}
              </span>
            </div>
          )}
        </div>

        {/* SMTP Configuration Form */}
        <form onSubmit={handleSaveSmtp} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                SMTP Host Server
              </label>
              <input
                type="text"
                required
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                SMTP Port (SSL/TLS)
              </label>
              <input
                type="number"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                placeholder="587"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Gmail / SMTP User Email
              </label>
              <input
                type="email"
                required
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="recruitment.notifications@gmail.com"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Gmail 16-Char App Password
              </label>
              <div className="relative">
                <input
                  type={showSmtpPassword ? 'text' : 'password'}
                  placeholder={smtpConfig?.has_password ? 'Leave empty to keep existing password' : 'Enter 16-char app password'}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Sender Display Name
              </label>
              <input
                type="text"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="AI Recruitment Hub"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 sm:pt-2">
              <input
                type="checkbox"
                id="smtpEnabledCheckbox"
                checked={smtpIsEnabled}
                onChange={(e) => setSmtpIsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="smtpEnabledCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                Enable Automated Email Notifications (Schedule & Results)
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSmtp || !smtpUser.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            >
              {savingSmtp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Activate SMTP Dispatcher</span>
            </button>
          </div>
        </form>

        {/* Live Test Email Section */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Send Live Test Verification Email</span>
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              placeholder="Enter your personal Gmail to receive test email..."
              value={testRecipientEmail}
              onChange={(e) => setTestRecipientEmail(e.target.value)}
              className="w-full sm:flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testingSmtp || !testRecipientEmail.trim() || !smtpConfig?.user}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Dispatch Test Email</span>
            </button>
          </div>

          {smtpTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                smtpTestResult.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {smtpTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{smtpTestResult.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Cloudinary Persistent Cloud Storage Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span>Cloudinary Cloud Storage (Candidate CVs)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                  Ephemeral Safe
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permanently stores uploaded candidate resumes in Cloudinary so files are never lost upon server restart or code deploy on Render/Railway.
              </p>
            </div>
          </div>

          {/* Cloudinary Status Badge */}
          {loadingCloudinary ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : cloudinaryConfig?.status.includes('Operational') ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{cloudinaryConfig.status}</span>
            </span>
          ) : !cloudinaryConfig?.is_enabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <span>Cloud Storage Disabled (Local Fallback Active)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{cloudinaryConfig?.status || 'Setup Required'}</span>
            </span>
          )}
        </div>

        {/* Cloudinary Credentials Info Box */}
        <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-950 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-600" />
              <span>Active Storage Mode:</span>
            </span>
            <span className="font-mono text-[11px] font-bold bg-white px-2.5 py-1 rounded-lg border border-cyan-200 text-cyan-950">
              {cloudinaryConfig?.is_enabled && cloudinaryConfig?.cloud_name
                ? `Cloudinary Cloud (${cloudinaryConfig.cloud_name})`
                : 'Local Server Storage (/uploads/resumes/)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Get your free credentials from <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="text-cyan-700 underline font-semibold">Cloudinary Console Dashboard</a>. When enabled, CV files are served via high-speed global CDN with secure HTTPS delivery.
          </p>
          {cloudinaryConfig?.has_secret && (
            <div className="flex items-center justify-between pt-1 border-t border-cyan-200/60">
              <span className="text-[11px] text-slate-600 font-medium">Masked API Secret:</span>
              <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-cyan-200 text-cyan-950">
                {cloudinaryConfig.masked_secret || '••••••••'}
              </span>
            </div>
          )}
        </div>

        {/* Cloudinary Configuration Form */}
        <form onSubmit={handleSaveCloudinary} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cloud Name
              </label>
              <input
                type="text"
                required
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                placeholder="e.g. dxyz123"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                API Key
              </label>
              <input
                type="text"
                required
                value={cloudinaryApiKey}
                onChange={(e) => setCloudinaryApiKey(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                API Secret
              </label>
              <div className="relative">
                <input
                  type={showCloudinarySecret ? 'text' : 'password'}
                  placeholder={cloudinaryConfig?.has_secret ? 'Leave empty to retain secret' : 'Enter API secret'}
                  value={cloudinaryApiSecret}
                  onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCloudinarySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="cloudinaryEnabledCheckbox"
                checked={cloudinaryIsEnabled}
                onChange={(e) => setCloudinaryIsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="cloudinaryEnabledCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                Enable Cloudinary Cloud Resume Storage (Recommended for Production)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestCloudinary}
                disabled={testingCloudinary || !cloudName.trim() || !cloudinaryApiKey.trim()}
                className="px-4 py-2 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-xl border border-cyan-200 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {testingCloudinary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test Cloudinary Connection</span>
              </button>

              <button
                type="submit"
                disabled={savingCloudinary || !cloudName.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
              >
                {savingCloudinary && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save & Activate Storage</span>
              </button>
            </div>
          </div>
        </form>

        {/* Live Cloudinary Test Ping Result Box */}
        {cloudinaryTestResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs ${
              cloudinaryTestResult.success
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {cloudinaryTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{cloudinaryTestResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Tenant Profile & Organization */}
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
