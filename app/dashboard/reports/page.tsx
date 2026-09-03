'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Download, ShieldCheck, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeRunId, setActiveRunId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveRunId(localStorage.getItem('active_run_id') || '');
    }

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveRunId(customEvent.detail.id);
      }
    };
    window.addEventListener('revalto-run-updated', handleUpdate);
    return () => {
      window.removeEventListener('revalto-run-updated', handleUpdate);
    };
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
      const headers = { 'x-user-id': userId };

      let runId = activeRunId;
      if (!runId) {
        const runRes = await fetch(`/api/runs?t=${Date.now()}`, { headers, cache: 'no-store' });
        const runData = await runRes.json();
        if (runData.runs && runData.runs.length > 0) {
          runId = runData.runs[0].id;
        } else {
          runId = 'DEMO-RUN-001';
        }
      }

      const res = await fetch(`/api/reports/${runId}?t=${Date.now()}`, { headers, cache: 'no-store' });
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeRunId]);

  const handleExportCsv = () => {
    if (!reportData?.transactions) return;

    const headers = ['Transaction ID', 'Invoice ID', 'Payment ID', 'Status', 'Category', 'ERP Amount', 'Payment Amount', 'Bank Amount', 'Difference'];
    const rows = reportData.transactions.map((t: any) => [
      t.transactionId,
      t.invoiceId || '',
      t.paymentId || '',
      t.status,
      t.exceptionType,
      t.erpAmount,
      t.paymentAmount,
      t.bankAmount,
      t.difference,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reconciliation_report_${reportData?.run?.id || 'run'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const run = reportData?.run;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Reconciliation & Audit Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">Export official compliance, summary, and audit reports in CSV format</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={!reportData?.transactions || reportData.transactions.length === 0}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Reconciled CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Summary Card */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Executive Summary Report</h3>
              <p className="text-xs text-slate-400">Match rates, total volume & exception breakdown</p>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Run ID:</span>
              <span className="font-mono font-bold text-indigo-400">{run?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Financial Events:</span>
              <span className="font-bold text-white">{run?.totalRecords ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Match Rate:</span>
              <span className="font-bold text-emerald-400">
                {run ? `${(run.matchRate).toFixed(1)}% (${run.matchedRecords}/${run.totalRecords})` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Exceptions:</span>
              <span className="font-bold text-rose-400">{run?.exceptionCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Audit Log Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Compliance & Audit Trail</h3>
              <p className="text-xs text-slate-400">Immutable ledger of run executions & user actions</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-2 border-t border-slate-800 pt-4 max-h-[300px] overflow-y-auto">
            {reportData?.auditLogs && reportData.auditLogs.length > 0 ? (
              reportData.auditLogs.map((log: any) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-indigo-400 font-bold block text-[10px]">{log.action}</span>
                  <p className="text-slate-300 mt-0.5">{log.details}</p>
                  <span className="text-[10px] text-slate-500 block mt-1">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">No audit logs recorded for this run.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
