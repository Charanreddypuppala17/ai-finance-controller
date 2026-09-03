'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Bot, Database, Menu } from 'lucide-react';

export function Navbar() {
  const [userId, setUserId] = useState('demo-user-001');
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const fetchRuns = async (uid: string) => {
    try {
      const res = await fetch(`/api/runs?t=${Date.now()}`, {
        headers: { 'x-user-id': uid },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.runs && data.runs.length > 0) {
        setRuns(data.runs);
        const storedActiveId = localStorage.getItem('active_run_id');
        if (storedActiveId && data.runs.some((r: any) => r.id === storedActiveId)) {
          setSelectedRunId(storedActiveId);
        } else {
          setSelectedRunId(data.runs[0].id);
          localStorage.setItem('active_run_id', data.runs[0].id);
          localStorage.setItem('active_run_total', String(data.runs[0].totalRecords));
        }
      } else {
        setRuns([]);
        setSelectedRunId('');
      }
    } catch (e) {
      console.error('Error fetching runs for Navbar:', e);
    }
  };

  useEffect(() => {
    const uid = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
    setUserId(uid);
    fetchRuns(uid);

    // Listen to custom updates from child pages
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const run = customEvent.detail;
        setSelectedRunId(run.id);
        localStorage.setItem('active_run_id', run.id);
        localStorage.setItem('active_run_total', String(run.totalRecords));
        fetchRuns(uid);
      }
    };
    window.addEventListener('revalto-run-updated', handleUpdate);
    return () => {
      window.removeEventListener('revalto-run-updated', handleUpdate);
    };
  }, []);

  const handleRunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const runId = e.target.value;
    setSelectedRunId(runId);
    
    const selectedRun = runs.find(r => r.id === runId);
    if (selectedRun) {
      localStorage.setItem('active_run_id', selectedRun.id);
      localStorage.setItem('active_run_total', String(selectedRun.totalRecords));
      
      // Dispatch update to other pages
      window.dispatchEvent(new CustomEvent('revalto-run-updated', {
        detail: selectedRun
      }));
    }
  };

  const toggleMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent('revalto-toggle-sidebar'));
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
      {/* Left: Mobile Hamburger & Active Workspace Selector */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 lg:hidden transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Run Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 min-w-0 max-w-[200px] sm:max-w-[320px] md:max-w-md">
          <Database className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          {runs.length > 0 ? (
            <select
              value={selectedRunId}
              onChange={handleRunChange}
              className="bg-transparent text-slate-300 border-none outline-none text-[11px] sm:text-xs font-semibold pr-1 sm:pr-2 cursor-pointer focus:ring-0 truncate w-full"
            >
              {runs.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-950 text-slate-300">
                  {r.name.length > 24 ? `${r.name.slice(0, 24)}...` : r.name} ({r.totalRecords} ev)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] sm:text-xs truncate">No Active Run</span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <Link
          href="/dashboard/copilot"
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 transition-all"
        >
          <Bot className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="hidden sm:inline">Ask AI Copilot</span>
          <span className="sm:hidden text-[11px]">Copilot</span>
        </Link>
        <button className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-850 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        </button>
      </div>
    </header>
  );
}
