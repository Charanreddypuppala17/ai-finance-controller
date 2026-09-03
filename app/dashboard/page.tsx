'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Bot,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  Layers,
  Zap,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function LedgerCashFlowSummary({ stats, summary }: { stats: any; summary: any }) {
  const erpSum = stats?.erpSum ?? 1485200;
  const paymentSum = stats?.paymentSum ?? 1482000;
  const feeSum = stats?.feeSum ?? 29640;
  const bankSum = stats?.bankSum ?? 1452360;

  const cashInTransit = Math.max(0, paymentSum - bankSum - feeSum);
  const unreconciledDiff = Math.max(0, erpSum - paymentSum);
  const matchRate = summary?.matchRate ?? 59.3;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Financial Ledger Matching Summary */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Ledger Cash Flow & Balance Matching Summary</span>
          </h3>

          <div className="space-y-4">
            {/* ERP Ledger */}
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs mb-1.5 gap-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  1. ERP Ledger (Invoiced)
                </span>
                <span className="font-extrabold text-white tabular-nums">₹{erpSum.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Payment Gateway */}
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs mb-1.5 gap-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                  2. Payment Gateway (Collected)
                </span>
                <span className="font-extrabold text-slate-200 tabular-nums">
                  ₹{paymentSum.toLocaleString()}
                  <span className="text-[10px] text-slate-500 font-normal ml-1">(Fee: ₹{feeSum.toLocaleString()})</span>
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(paymentSum / erpSum * 100) || 99}%` }} />
              </div>
            </div>

            {/* Bank Statement */}
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs mb-1.5 gap-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                  3. Bank Statement (Settled)
                </span>
                <span className="font-extrabold text-slate-200 tabular-nums">₹{bankSum.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800">
                <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${(bankSum / erpSum * 100) || 97}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Differences Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-800/60 text-xs">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850">
            <span className="text-slate-500 block font-medium mb-1">Cash in Transit (Unsettled)</span>
            <span className="text-sm font-extrabold text-indigo-400 tabular-nums">₹{cashInTransit.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850">
            <span className="text-slate-500 block font-medium mb-1">Unreconciled Difference</span>
            <span className={`text-sm font-extrabold tabular-nums ${unreconciledDiff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₹{unreconciledDiff.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Audit & Verification Checklist */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Audit & Verification Checklist</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
            Deterministic status controls for active reconciliation execution parameters.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-emerald-500/30">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Ingestion & Schema Match</span>
                <span className="text-[10px] text-slate-500">Zod structure verified; headers aligned.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-emerald-500/30">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Data Normalization</span>
                <span className="text-[10px] text-slate-500">Currencies rounded; dates mapped to ISO.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-emerald-500/30">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Deterministic ID Match</span>
                <span className="text-[10px] text-slate-500 font-semibold">Verified links: {matchRate.toFixed(1)}% exact rate.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-amber-500/30">
                !
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Exception Classification</span>
                <span className="text-[10px] text-slate-500">Isolated {summary?.exceptionCount ?? 61} attention records.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-500">
          <span>Sign-off Status: <strong className="text-rose-400">PENDING</strong></span>
          <span className="font-mono text-[9px]">{summary?.id || 'RUN-DEMO'}</span>
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = [
  '#f43f5e', // Rose (Amount Mismatch)
  '#a855f7', // Purple (Fee Mismatch)
  '#3b82f6', // Blue (Timing Lag)
  '#eab308', // Amber (Missing Bank)
  '#ec4899', // Pink (Missing Payment)
  '#10b981', // Emerald (Duplicate Record)
];

export default function OverviewDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('demo-user-001');
  const [activeRunId, setActiveRunId] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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

  useEffect(() => {
    async function fetchData() {
      try {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
        setUserId(storedId);
        const headers = { 'x-user-id': storedId };

        const runsUrl = activeRunId 
          ? `/api/runs?runId=${activeRunId}&t=${Date.now()}` 
          : `/api/runs?t=${Date.now()}`;
        const txnsUrl = activeRunId
          ? `/api/transactions?limit=10&status=EXCEPTION&runId=${activeRunId}&t=${Date.now()}`
          : `/api/transactions?limit=10&status=EXCEPTION&t=${Date.now()}`;

        const [runRes, txnRes] = await Promise.all([
          fetch(runsUrl, { headers, cache: 'no-store' }),
          fetch(txnsUrl, { headers, cache: 'no-store' }),
        ]);

        const runData = await runRes.json();
        const txnData = await txnRes.json();

        if (runData.runs && runData.runs.length > 0) {
          const currentRun = activeRunId 
            ? runData.runs.find((r: any) => r.id === activeRunId) || runData.runs[0]
            : runData.runs[0];
          setSummary(currentRun);
        } else {
          setSummary(null);
        }

        if (runData.stats) {
          setStats(runData.stats);
        } else {
          setStats(null);
        }

        if (txnData.transactions) {
          setTransactions(txnData.transactions);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeRunId]);

  const formatExceptionName = (type: string) => {
    switch (type) {
      case 'FEE_MISMATCH': return 'Fee Mismatch';
      case 'AMOUNT_MISMATCH': return 'Amount Mismatch';
      case 'TIMING_LAG': return 'Timing Lag';
      case 'MISSING_BANK_SETTLEMENT': return 'Missing Bank';
      case 'MISSING_PAYMENT_RECORD': return 'Missing Payment';
      case 'DUPLICATE_RECORD': return 'Duplicate';
      default: return type ? type.replace(/_/g, ' ') : 'Unknown';
    }
  };

  const categoryData = stats?.exceptionsBreakdown && stats.exceptionsBreakdown.length > 0
    ? stats.exceptionsBreakdown.map((eb: any) => ({
        name: formatExceptionName(eb.type),
        count: eb.count,
      }))
    : [
        { name: 'Fee Mismatch', count: 16 },
        { name: 'Amount Mismatch', count: 15 },
        { name: 'Timing Lag', count: 10 },
        { name: 'Missing Bank', count: 10 },
        { name: 'Missing Payment', count: 5 },
      ];

  const isDemo = userId === 'demo-user-001';
  const hasNoData = !summary;

  const [userEmail, setUserEmail] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserEmail(localStorage.getItem('user_email') || '');
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        {/* Header Banner Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 sm:w-56 bg-slate-800/80 rounded-lg" />
            <div className="h-3.5 w-64 sm:w-80 bg-slate-800/40 rounded-md" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-10 flex-1 sm:w-36 bg-slate-800/80 rounded-xl" />
            <div className="h-10 flex-1 sm:w-28 bg-slate-800/50 rounded-xl" />
          </div>
        </div>

        {/* Health Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-800/80 rounded" />
                <div className="w-8 h-8 rounded-lg bg-slate-800/60" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-8 w-16 bg-slate-800 rounded-lg" />
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!loading && !isDemo && hasNoData) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        {/* Header Banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Reconciliation Overview</h1>
            <p className="text-xs text-slate-400 mt-1">Get started by running a multi-source reconciliation ledger match</p>
          </div>
        </div>

        {/* Empty State Hero */}
        <div className="glass-panel rounded-2xl p-6 sm:p-12 border border-slate-800 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-8 sm:mt-12 shadow-2xl relative overflow-hidden">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 sm:mb-6 shadow-inner">
            <RefreshCw className="w-7 sm:w-8 h-7 sm:h-8 animate-spin-slow" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">No Active Reconciliation Runs</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            Revalto isolates financial data per session. To populate your ledger analytics, upload your ERP, Payment Gateway, and Bank Statement CSV logs.
          </p>

          {userEmail && (
            <div className="mb-5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400">
              Active Session: <span className="text-indigo-400 font-bold">{userEmail}</span>
            </div>
          )}

          <Link
            href="/dashboard/reconciliation"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Upload Files & Run Reconciliation</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Reconciliation Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-source financial health report for active run <strong>{summary?.id || 'DEMO-RUN-001'}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Link
            href="/dashboard/reconciliation"
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Reconcile</span>
          </Link>
          <Link
            href="/dashboard/reports"
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Report</span>
          </Link>
        </div>
      </div>

      {/* Reconciliation Health Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-6">
        {/* Match Health Score Card */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Match Health Score</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
              {(summary?.matchRate ?? 59.3).toFixed(1)}%
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> High Precision
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
            {summary?.matchedRecords ?? 89} of {summary?.totalRecords ?? 150} records matched
          </p>
        </div>

        {/* Total Events */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Financial Events</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{summary?.totalRecords ?? 150}</span>
            <span className="text-[10px] text-indigo-400 block font-bold mt-0.5 tabular-nums">
              Total Amt: ₹{(stats?.erpSum ?? 1485200).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-2">Across ERP, Gateway & Bank</p>
        </div>

        {/* Matched Records */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Matched Records</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">{summary?.matchedRecords ?? 89}</span>
            <span className="text-[10px] text-emerald-400 block font-bold mt-0.5 tabular-nums">
              Matched: ₹{(stats?.matchedSum ?? 1218500).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-2">100% Exact 3-way verified</p>
        </div>

        {/* Exceptions Count */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 hover:border-rose-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Unresolved Exceptions</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 tabular-nums">{summary?.exceptionCount ?? 61}</span>
            <span className="text-[10px] text-rose-400 block font-bold mt-0.5 tabular-nums">
              Discrepancy: ₹{(stats?.discrepancySum ?? 1887500).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-2">Fees, timing & missing items</p>
        </div>

        {/* Resolved Exceptions */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Resolved Exceptions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
              {summary?.resolvedCount ?? stats?.resolvedCount ?? 0}
            </span>
            <span className="text-[10px] text-emerald-400 block font-bold mt-0.5 tabular-nums">
              Resolved: ₹{(stats?.resolvedSum ?? 0).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-2">Manually verified & cleared</p>
        </div>
      </div>

      {/* Balance Matching & Verification Checklist */}
      <LedgerCashFlowSummary stats={stats} summary={summary} />

      {/* Exception Breakdown & Quick Copilot Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Exception Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col justify-between select-none">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white mb-4">Exception Categories Breakdown</h3>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 min-h-64 py-2">
              {/* Donut Chart */}
              <div className="w-44 sm:w-48 h-44 sm:h-48 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData.filter((d: any) => d.count > 0)}
                      nameKey="name"
                      dataKey="count"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      animationDuration={800}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {categoryData.filter((d: any) => d.count > 0).map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PIE_COLORS[index % PIE_COLORS.length]} 
                          style={{
                            outline: 'none',
                            cursor: 'pointer',
                            filter: activeIndex === index ? 'brightness(1.15)' : 'none',
                            transition: 'all 0.2s ease-in-out'
                          }} 
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Errors</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums">
                    {categoryData.reduce((acc: number, curr: any) => acc + curr.count, 0)}
                  </span>
                </div>
              </div>

              {/* Custom Legend & Details */}
              <div className="flex flex-col justify-between w-full sm:w-[220px] py-1 space-y-3">
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto touch-scroll pr-1">
                  {categoryData.filter((d: any) => d.count > 0).map((entry: any, index: number) => (
                    <div 
                      key={entry.name} 
                      className={`flex items-center justify-between text-xs transition-opacity duration-200 ${
                        activeIndex !== null && activeIndex !== index ? 'opacity-30' : 'opacity-100'
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-slate-400 font-medium truncate max-w-[130px]">{entry.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-200 tabular-nums">{entry.count}</span>
                    </div>
                  ))}
                </div>

                {/* Side Detail Card */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 min-h-[50px] flex flex-col justify-center">
                  {activeIndex !== null && categoryData.filter((d: any) => d.count > 0)[activeIndex] ? (
                    <div className="animate-fade-in flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[activeIndex % PIE_COLORS.length] }}
                        />
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          {categoryData.filter((d: any) => d.count > 0)[activeIndex].name}
                        </span>
                      </div>
                      <span 
                        className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                        style={{ color: PIE_COLORS[activeIndex % PIE_COLORS.length] }}
                      >
                        {categoryData.filter((d: any) => d.count > 0)[activeIndex].count} errors
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-slate-500 italic">
                      Hover or tap slice to inspect
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Copilot Prompter Widget */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">AI Finance Copilot</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Ask evidence-backed questions about transaction root causes.
            </p>

            <div className="space-y-2">
              <Link
                href="/dashboard/copilot?q=Tell+me+about+transaction+17"
                className="block p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-indigo-300 hover:border-indigo-500/50 transition-colors"
              >
                💬 <strong>"Why is transaction #17 mismatched?"</strong>
              </Link>
              <Link
                href="/dashboard/copilot?q=Show+reconciliation+summary"
                className="block p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-indigo-300 hover:border-indigo-500/50 transition-colors"
              >
                📊 <strong>"Summarize reconciliation health"</strong>
              </Link>
            </div>
          </div>

          <Link
            href="/dashboard/copilot"
            className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600/30 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>Open AI Chat Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Needs Attention Table */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Needs Attention — High Discrepancy Exceptions</span>
          </h3>
          <Link href="/dashboard/exceptions" className="text-xs text-indigo-400 hover:underline font-semibold">
            View All {summary?.exceptionCount ?? 61} Exceptions
          </Link>
        </div>

        <div className="table-responsive rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Exception Category</th>
                <th className="px-4 py-3">ERP Amount</th>
                <th className="px-4 py-3">Payment Amount</th>
                <th className="px-4 py-3">Bank Amount</th>
                <th className="px-4 py-3">Difference</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {transactions.filter(t => t.status === 'EXCEPTION').slice(0, 6).map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-900/40 border-b border-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-indigo-400">{txn.transactionId}</td>
                  <td className="px-4 py-3 font-mono">{txn.invoiceId || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
                      {formatExceptionName(txn.exceptionType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">₹{txn.erpAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">₹{txn.paymentAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">₹{txn.bankAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-rose-400 tabular-nums">₹{txn.difference.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/copilot?q=Investigate+transaction+${txn.transactionId}`}
                      className="px-2.5 py-1 rounded bg-indigo-600/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/40 transition-all inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Investigate</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
