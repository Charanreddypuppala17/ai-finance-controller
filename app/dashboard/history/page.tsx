'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, CheckCircle2, AlertTriangle, ArrowRight, Calendar, RefreshCw } from 'lucide-react';

export default function HistoryPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
        const res = await fetch(`/api/runs?t=${Date.now()}`, {
          headers: { 'x-user-id': userId },
          cache: 'no-store'
        });
        const data = await res.json();
        if (data.runs) {
          setRuns(data.runs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRuns();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Reconciliation Run History</h1>
        <p className="text-xs text-slate-400 mt-0.5">Audit trail of past multi-source reconciliation executions</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-12">Loading run history...</p>
        ) : runs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-12">No historical runs found.</p>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/40 transition-all"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs font-bold text-indigo-400 font-mono truncate">{run.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                    {run.status}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{run.name}</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{run.createdAt ? new Date(run.createdAt).toLocaleString() : 'N/A'}</span>
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                <div className="text-left sm:text-right">
                  <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">{run.matchRate}%</span>
                  <p className="text-[10px] text-slate-400">Match ({run.matchedRecords}/{run.totalRecords})</p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-lg sm:text-xl font-bold text-rose-400 tabular-nums">{run.exceptionCount}</span>
                  <p className="text-[10px] text-slate-400">Exceptions</p>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => {
                    localStorage.setItem('active_run_id', run.id);
                    localStorage.setItem('active_run_total', String(run.totalRecords));
                    window.dispatchEvent(new CustomEvent('revalto-run-updated', { detail: run }));
                  }}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                  title="Open Run in Dashboard"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
