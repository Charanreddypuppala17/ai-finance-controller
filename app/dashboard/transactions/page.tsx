'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Bot, X, CheckCircle2, AlertTriangle, ChevronRight, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);

  const [activeRunId, setActiveRunId] = useState('');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
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
      setSortOrder('desc'); // default to desc (high-to-low)
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

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reconciled Transactions Explorer</h1>
        <p className="text-xs text-slate-400 mt-1">Search, filter, and inspect line-by-line financial evidence</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass-panel p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search Txn ID, Invoice, Payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sorting Dropdown beside Search Bar */}
          <div className="relative flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="bg-transparent text-slate-300 border-none outline-none cursor-pointer text-xs pr-1 focus:ring-0"
              >
                <option value="createdAt:desc" className="bg-slate-950 text-slate-300">Sort: Default</option>
                <option value="transactionId:asc" className="bg-slate-950 text-slate-300">Txn ID: Low to High</option>
                <option value="transactionId:desc" className="bg-slate-950 text-slate-300">Txn ID: High to Low</option>
                <option value="difference:asc" className="bg-slate-950 text-slate-300">Difference: Low to High</option>
                <option value="difference:desc" className="bg-slate-950 text-slate-300">Difference: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {['ALL', 'MATCHED', 'EXCEPTION'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
                      <span className="text-[11px] font-medium text-slate-300">{t.exceptionType}</span>
                    </td>
                    <td className="px-4 py-3">₹{t.erpAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">₹{t.paymentAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">₹{t.bankAmount.toLocaleString()}</td>
                    <td
                      className={`px-4 py-3 font-bold ${
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
        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-800/80 bg-slate-900/40 text-xs">
          <div className="text-slate-400">
            Showing <span className="font-semibold text-white">{totalCount > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(totalCount, page * limit)}</span> of{' '}
            <span className="font-semibold text-white">{totalCount}</span> entries
          </div>

          <div className="flex items-center gap-4">
            {/* Limit Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Show</span>
              <select
                value={limit === 1000 ? 'ALL' : limit}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimit(val === 'ALL' ? 1000 : parseInt(val, 10));
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">All</option>
              </select>
            </div>

            {/* Prev/Next Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 bg-slate-950/60 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800 transition-all font-semibold"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let targetPage = page;
                  if (page <= 3) {
                    targetPage = i + 1;
                  } else if (page >= totalPages - 2) {
                    targetPage = totalPages - 4 + i;
                  } else {
                    targetPage = page - 2 + i;
                  }

                  if (targetPage < 1 || targetPage > totalPages) return null;

                  return (
                    <button
                      key={targetPage}
                      onClick={() => setPage(targetPage)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        page === targetPage
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {targetPage}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 bg-slate-950/60 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800 transition-all font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Slide-over Drawer */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#0d1322] h-full p-8 overflow-y-auto border-l border-slate-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs text-indigo-400 font-mono font-bold">{selectedTxn.transactionId}</span>
                  <h3 className="text-xl font-bold text-white">Transaction Evidence Detail</h3>
                </div>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Reconciliation Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedTxn.status === 'MATCHED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {selectedTxn.status} ({selectedTxn.exceptionType})
                  </span>
                </div>

                {/* Amounts Breakdown */}
                <div className="glass-card p-4 rounded-xl space-y-2 border border-slate-800 text-xs">
                  <h4 className="font-bold text-slate-300 mb-2">Multi-Source Values</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ERP Invoice Amount:</span>
                    <span className="font-bold text-white">₹{selectedTxn.erpAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Gateway Amount:</span>
                    <span className="font-bold text-white">₹{selectedTxn.paymentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gateway Fee:</span>
                    <span className="font-bold text-indigo-400">₹{selectedTxn.feeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank Settlement Amount:</span>
                    <span className="font-bold text-white">₹{selectedTxn.bankAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 font-extrabold text-sm">
                    <span className="text-slate-300">Net Difference:</span>
                    <span className={selectedTxn.difference > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      ₹{selectedTxn.difference.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Evidence Note */}
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                  <h4 className="font-bold mb-1">Matching Evidence & Rationale</h4>
                  <p className="text-slate-300 leading-relaxed">
                    {(() => {
                      try {
                        const ev = JSON.parse(selectedTxn.evidenceJson);
                        return ev.summary || 'Verified by 5-level deterministic matcher.';
                      } catch (e) {
                        return selectedTxn.evidenceJson;
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex items-center gap-3">
              <Link
                href={`/dashboard/copilot?q=Investigate+transaction+${selectedTxn.transactionId}`}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Bot className="w-4 h-4" />
                <span>Investigate with AI Copilot</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
