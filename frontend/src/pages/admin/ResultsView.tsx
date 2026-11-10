import React, { useState } from 'react';
import {
  CheckCircle2,
  FileCheck,
  Send,
} from 'lucide-react';

interface ResultItem {
  id: string;
  candidate_name: string;
  email: string;
  job_title: string;
  overall_score: number;
  ai_recommendation: string;
  admin_decision: 'OFFER_EXTENDED' | 'REJECTED' | 'UNDER_REVIEW';
  is_published: boolean;
  published_date: string | null;
}

const INITIAL_RESULTS: ResultItem[] = [
  {
    id: 'res-1',
    candidate_name: 'Imran Hossain',
    email: 'imran.h@example.com',
    job_title: 'DevOps & Cloud Engineer',
    overall_score: 91,
    ai_recommendation: 'STRONG_HIRE',
    admin_decision: 'OFFER_EXTENDED',
    is_published: true,
    published_date: 'Nov 09, 2026',
  },
  {
    id: 'res-2',
    candidate_name: 'Fariha Chowdhury',
    email: 'fariha.c@example.com',
    job_title: 'Backend Python Engineer',
    overall_score: 82,
    ai_recommendation: 'HIRE',
    admin_decision: 'OFFER_EXTENDED',
    is_published: false,
    published_date: null,
  },
  {
    id: 'res-3',
    candidate_name: 'Nusrat Jahan',
    email: 'nusrat.j@example.com',
    job_title: 'Senior Full Stack Engineer',
    overall_score: 62,
    ai_recommendation: 'REJECT',
    admin_decision: 'REJECTED',
    is_published: true,
    published_date: 'Nov 08, 2026',
  },
];

export const ResultsView: React.FC = () => {
  const [results, setResults] = useState<ResultItem[]>(INITIAL_RESULTS);

  const togglePublish = (id: string) => {
    setResults(
      results.map((r) => {
        if (r.id === id) {
          const next = !r.is_published;
          return {
            ...r,
            is_published: next,
            published_date: next ? new Date().toLocaleDateString() : null,
          };
        }
        return r;
      })
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-600" />
          <span>Final Results & Candidate Offer Management</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review overall AI ratings, override final hiring decisions, and publish results directly to candidate portals.
        </p>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Candidate</th>
                <th className="py-3.5 px-6">Applied Role</th>
                <th className="py-3.5 px-6">Overall Score</th>
                <th className="py-3.5 px-6">Admin Decision</th>
                <th className="py-3.5 px-6">Portal Status</th>
                <th className="py-3.5 px-6 text-right">Publish Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((res) => (
                <tr key={res.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6">
                    <h4 className="font-bold text-slate-800 text-sm">{res.candidate_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{res.email}</p>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                    {res.job_title}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                      {res.overall_score}%
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        res.admin_decision === 'OFFER_EXTENDED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : res.admin_decision === 'UNDER_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {res.admin_decision.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {res.is_published ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Visible to Candidate</span>
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        Internal Draft
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => togglePublish(res.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        res.is_published
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-purple-600 text-white shadow-xs hover:bg-purple-700'
                      }`}
                    >
                      {res.is_published ? (
                        <span>Unpublish</span>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Publish Result</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
