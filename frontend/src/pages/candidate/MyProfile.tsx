import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Save,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/Alert';
import { candidateApi } from '../../api/candidate';

export const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form fields
  const [headline, setHeadline] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await candidateApi.getProfile();
      setHeadline(data.headline || 'Full Stack & AI Systems Engineer');
      setPhone(data.phone || user?.phone || '');
      setLocation(data.location || 'Dhaka, Bangladesh');
      setBio(data.bio || 'Passionate software engineer experienced in Python, React, PostgreSQL, and AI agent architectures.');
      setGithubUrl(data.github_url || 'https://github.com');
      setLinkedinUrl(data.linkedin_url || 'https://linkedin.com/in');
      setPortfolioUrl(data.portfolio_url || '');
      setSkillsInput((data.skills && data.skills.length > 0 ? data.skills : ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL']).join(', '));
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const skillsArray = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await candidateApi.updateProfile({
        headline,
        phone,
        location,
        bio,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        skills: skillsArray,
      });
      setAlert({
        type: 'success',
        message: 'Profile updated and saved to PostgreSQL successfully!',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn pb-16">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-600" />
          <span>Candidate Profile & Information</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Keep your details up-to-date so Google Gemini CV Screening and recruiters can evaluate you accurately.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">Loading profile information...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
          {/* Header row: Name & Email (read only account details) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                disabled
                value={user?.full_name || 'Candidate'}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'candidate@example.com'}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Headline & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Full Stack & AI Systems Engineer"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1700 000000"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Current Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dhaka, Bangladesh or Remote"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Social & Professional Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                GitHub Profile
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                LinkedIn Profile
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Portfolio / Website
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://portfolio.dev"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Skills & Core Technologies (Comma separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Python, FastAPI, React, TypeScript, PostgreSQL, WebRTC"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              About Me / Bio
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your background, technical interests, and career objectives..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
