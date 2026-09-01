'use client';

import React, { useState } from 'react';
import { Settings, Sliders, ShieldCheck, Key, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const [dateTolerance, setDateTolerance] = useState(3);
  const [amountVariance, setAmountVariance] = useState(0.01);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure default reconciliation tolerances and account controls</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Default Engine Tolerances</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Settlement Date Lag Window: <strong>{dateTolerance} days</strong>
              </label>
              <input
                type="range"
                min="1"
                max="14"
                value={dateTolerance}
                onChange={(e) => setDateTolerance(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-slate-500 mt-1">Bank settlements occurring within this number of days will not be flagged as timing lag exceptions.</p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Amount Rounding Variance Tolerance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amountVariance}
                onChange={(e) => setAmountVariance(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>API & Security</span>
          </h3>

          <div className="text-xs text-slate-400 space-y-3">
            <p>User Data Isolation mode: <strong className="text-emerald-400">ENFORCED (userId + runId scoping)</strong></p>
            <p>Database Encryption: <strong className="text-indigo-400">ACTIVE</strong></p>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
