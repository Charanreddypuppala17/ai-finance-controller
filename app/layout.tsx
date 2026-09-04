import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revalto — AI-Powered 3-Way Financial Reconciliation & Audit Copilot',
  description: 'Multi-source financial reconciliation platform powered by deterministic 5-level matching algorithms and evidence-backed AI Copilot.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#070b12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070b12] text-slate-100 antialiased min-h-screen overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
