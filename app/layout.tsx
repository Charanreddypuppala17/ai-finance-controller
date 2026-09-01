import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revalto — Multi-Source Reconciliation & AI Copilot',
  description: 'Multi-source financial reconciliation platform powered by deterministic matching algorithms and evidence-backed AI Copilot.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#070b12] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
