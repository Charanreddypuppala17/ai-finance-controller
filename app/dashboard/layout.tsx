'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 min-h-screen">
        <Navbar />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto touch-scroll w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
