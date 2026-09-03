'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Bot, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpDown, 
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);

  const [activeRunId, setActiveRunId] = useState('');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting States
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Reset page to 1 whenever search, filters, or run ID changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, activeRunId, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

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
    async function fetchTransactions() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set('search', search);
        if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
        if (activeRunId) queryParams.set('runId', activeRunId);
        queryParams.set('page', page.toString());
        queryParams.set('limit', limit.toString());
        if (sortBy !== 'createdAt') queryParams.set('sortBy', sortBy);
        queryParams.set('sortOrder', sortOrder);
        queryParams.set('t', Date.now().toString());

        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
        const res = await fetch(`/api/transactions?${queryParams.toString()}`, {
          headers: { 'x-user-id': userId },
          cache: 'no-store'
        });
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
        }
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [search, statusFilter, activeRunId, page, limit, sortBy, sortOrder]);

  const formatExceptionName = (type: string) => {
    if (!type) return '-';
    switch (type) {
      case 'FEE_MISMATCH': return 'Fee Mismatch';
      case 'AMOUNT_MISMATCH': return 'Amount Mismatch';
      case 'TIMING_LAG': return 'Timing Lag';
      case 'MISSING_BANK_SETTLEMENT': return 'Missing Bank';
      case 'MISSING_PAYMENT_RECORD': return 'Missing Payment';
      case 'DUPLICATE_PAYMENT': return 'Duplicate';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Transactions Explorer</h1>
          <p className="text-xs text-slate-400 mt-0.5">Search, filter, and inspect line-by-line financial evidence</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono">
            Total: <strong className="text-white tabular-nums">{totalCount}</strong>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Txn ID, Invoice, or Payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Sorting Dropdown */}
          <div className="sm:col-span-5 relative">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="bg-transparent text-slate-200 border-none outline-none cursor-pointer text-xs w-full focus:ring-0 truncate"
              >
                <option value="createdAt:desc" className="bg-slate-950 text-slate-300">Default (Recent First)</option>
                <option value="transactionId:asc" className="bg-slate-950 text-slate-300">Txn ID: Low to High</option>
                <option value="transactionId:desc" className="bg-slate-950 text-slate-300">Txn ID: High to Low</option>
                <option value="difference:desc" className="bg-slate-950 text-slate-300">Difference: High to Low</option>
                <option value="difference:asc" className="bg-slate-950 text-slate-300">Difference: Low to High</option>
                <option value="erpAmount:desc" className="bg-slate-950 text-slate-300">ERP Amount: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Segmented Filter Tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/70 border border-slate-850 rounded-xl gap-1">
          {['ALL', 'MATCHED', 'EXCEPTION'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all text-center ${
                statusFilter === st
                  ? st === 'MATCHED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : st === 'EXCEPTION'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Records' : st === 'MATCHED' ? '✓ Matched' : '⚠ Exceptions'}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW (< md): Card Stream Layout */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-slate-800 rounded" />
                  <div className="h-4 w-16 bg-slate-800 rounded-full" />
                </div>
                <div className="h-12 bg-slate-900/60 rounded-xl" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No transactions found</p>
            <p className="text-[11px] text-slate-500">Try adjusting your search query or status filters.</p>
          </div>
        ) : (
          transactions.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTxn(t)}
              className="glass-card rounded-2xl p-4 border border-slate-800 hover:border-indigo-500/40 active:bg-slate-900/80 transition-all space-y-3 cursor-pointer relative group"
            >
              {/* Header: Txn ID + Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-indigo-400 font-mono truncate">{t.transactionId}</span>
                  {t.invoiceId && (
                    <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 truncate">
                      {t.invoiceId}
                    </span>
                  )}
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 flex items-center gap-1 ${
                    t.status === 'MATCHED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {t.status === 'MATCHED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  <span>{t.status}</span>
                </span>
              </div>

              {/* Exception Tag if any */}
              {t.exceptionType && t.status !== 'MATCHED' && (
                <div className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                  <span>Category:</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px]">
                    {formatExceptionName(t.exceptionType)}
                  </span>
                </div>
              )}

              {/* Amounts Summary Box */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-850 text-center">
                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">ERP Invoiced</span>
                  <span className="text-xs font-bold text-white tabular-nums">₹{t.erpAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Gateway</span>
                  <span className="text-xs font-bold text-slate-200 tabular-nums">₹{t.paymentAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Bank Settled</span>
                  <span className="text-xs font-bold text-slate-200 tabular-nums">₹{t.bankAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Footer: Difference & Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-850/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Net Difference</span>
                  <span className={`font-extrabold tabular-nums ${t.difference > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {t.difference > 0 ? `₹${t.difference.toLocaleString()}` : '₹0 (Balanced)'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-indigo-400 font-semibold text-[11px]">
                  <span>Inspect Evidence</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW (>= md): Full High-Density Data Table */}
      <div className="hidden md:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">ERP Amount</th>
                <th className="px-4 py-3">Payment Amount</th>
                <th className="px-4 py-3">Bank Amount</th>
                <th className="px-4 py-3">Difference</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-indigo-400">{t.transactionId}</td>
                    <td className="px-4 py-3 font-mono">{t.invoiceId || '-'}</td>
                    <td className="px-4 py-3 font-mono">{t.paymentId || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'MATCHED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-slate-300">{formatExceptionName(t.exceptionType)}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">₹{t.erpAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">₹{t.paymentAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">₹{t.bankAmount.toLocaleString()}</td>
                    <td
                      className={`px-4 py-3 font-bold tabular-nums ${
                        t.difference > 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {t.difference > 0 ? `₹${t.difference.toLocaleString()}` : '₹0'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hover:text-indigo-400">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsive Pagination Controls */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-400 text-center sm:text-left text-[11px] sm:text-xs">
          Showing <span className="font-semibold text-white tabular-nums">{totalCount > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
          <span className="font-semibold text-white tabular-nums">{Math.min(totalCount, page * limit)}</span> of{' '}
          <span className="font-semibold text-white tabular-nums">{totalCount}</span> records
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Limit Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Show:</span>
            <select
              value={limit === 1000 ? 'ALL' : limit}
              onChange={(e) => {
                const val = e.target.value;
                setLimit(val === 'ALL' ? 1000 : parseInt(val, 10));
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">All</option>
            </select>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 bg-slate-950/60 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800 transition-all font-semibold"
            >
              Prev
            </button>
            
            <span className="px-2.5 py-1 text-xs font-mono text-slate-300 bg-slate-900 rounded-lg border border-slate-850">
              {page} / {Math.max(1, totalPages)}
            </span>

            <button
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 bg-slate-950/60 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800 transition-all font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Detail Slide-over Drawer / Bottom Sheet */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full sm:max-w-md lg:max-w-lg bg-[#0d1322] h-full p-4 sm:p-8 overflow-y-auto touch-scroll border-l border-slate-800 shadow-2xl flex flex-col justify-between">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="min-w-0">
                  <span className="text-xs text-indigo-400 font-mono font-bold">{selectedTxn.transactionId}</span>
                  <h3 className="text-lg sm:text-xl font-bold text-white truncate">Transaction Evidence Detail</h3>
                </div>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 transition-colors flex-shrink-0"
                  aria-label="Close detail modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Header Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">Match Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    selectedTxn.status === 'MATCHED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {selectedTxn.status === 'MATCHED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{selectedTxn.status} {selectedTxn.exceptionType ? `(${formatExceptionName(selectedTxn.exceptionType)})` : ''}</span>
                </span>
              </div>

              {/* Multi-Source Values Breakdown */}
              <div className="glass-card p-4 rounded-xl space-y-2.5 border border-slate-800 text-xs">
                <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Multi-Source Values</span>
                </h4>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">ERP Invoice Amount:</span>
                  <span className="font-bold text-white tabular-nums">₹{selectedTxn.erpAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Payment Gateway Amount:</span>
                  <span className="font-bold text-white tabular-nums">₹{selectedTxn.paymentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Gateway Fee:</span>
                  <span className="font-bold text-indigo-400 tabular-nums">₹{selectedTxn.feeAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Bank Settlement Amount:</span>
                  <span className="font-bold text-white tabular-nums">₹{selectedTxn.bankAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 font-extrabold text-sm">
                  <span className="text-slate-300">Net Difference:</span>
                  <span className={`tabular-nums ${selectedTxn.difference > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{selectedTxn.difference.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Matching Evidence Note */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>Matching Evidence & Rationale</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {(() => {
                    try {
                      const ev = JSON.parse(selectedTxn.evidenceJson);
                      return ev.summary || 'Verified by 5-level deterministic matcher.';
                    } catch (e) {
                      return selectedTxn.evidenceJson || 'Verified by 5-level deterministic matcher.';
                    }
                  })()}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 mt-6 border-t border-slate-800 space-y-2">
              <Link
                href={`/dashboard/copilot?q=Investigate+transaction+${selectedTxn.transactionId}`}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>Investigate with AI Copilot</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
