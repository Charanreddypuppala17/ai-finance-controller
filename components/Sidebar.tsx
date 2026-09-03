'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  History,
  Bot,
  FileText,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Reconciliation', href: '/dashboard/reconciliation', icon: RefreshCw },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileSpreadsheet },
  { name: 'Exceptions', href: '/dashboard/exceptions', icon: AlertTriangle },
  { name: 'Resolved Exceptions', href: '/dashboard/resolved', icon: CheckCircle2 },
  { name: 'History', href: '/dashboard/history', icon: History },
  { name: 'AI Copilot', href: '/dashboard/copilot', icon: Bot },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState('demo@aifinance.com');
  const [name, setName] = useState('Demo Account');
  const [initials, setInitials] = useState('DF');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('user_email');
      const storedName = localStorage.getItem('user_name');
      const storedId = localStorage.getItem('user_id');

      if (storedEmail) setEmail(storedEmail);
      
      if (storedId === 'demo-user-001') {
        setName('Demo Account');
        setInitials('DF');
      } else if (storedName) {
        setName(storedName);
        const nameParts = storedName.split(' ');
        const init = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
        setInitials(init || 'US');
      } else if (storedEmail) {
        const localPart = storedEmail.split('@')[0];
        const formattedName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
        setName(formattedName);
        setInitials(localPart.slice(0, 2).toUpperCase());
      }
    }

    const handleToggle = () => setMobileOpen(prev => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener('revalto-toggle-sidebar', handleToggle);
    window.addEventListener('revalto-close-sidebar', handleClose);

    return () => {
      window.removeEventListener('revalto-toggle-sidebar', handleToggle);
      window.removeEventListener('revalto-close-sidebar', handleClose);
    };
  }, []);

  // Auto-close on pathname change for mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Drawer on mobile, stationary on desktop) */}
      <aside
        className={`w-64 glass-panel h-full flex flex-col fixed left-0 top-0 z-50 lg:z-30 border-r border-slate-800 transition-transform duration-300 ease-in-out bg-[#090d16] ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Logo & Mobile Close Button */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
            <Logo size={36} showText={true} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 lg:hidden transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-3.5 sm:px-4 py-4 sm:py-6 space-y-1.5 overflow-y-auto touch-scroll">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Badge */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 mt-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{email}</p>
                <p className="text-[10px] text-slate-500 truncate">{name}</p>
              </div>
            </div>
            <Link
              href="/login"
              className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800/60 flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
