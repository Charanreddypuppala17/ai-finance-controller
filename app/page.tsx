'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import {
  ShieldCheck,
  Zap,
  Bot,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Scale,
  Building2,
  Lock,
} from 'lucide-react';

// Interactive 3D Card Tilt Component
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = React.useState(0);
  const [rotateY, setRotateY] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    // Scale rotation to -12 to 12 degrees
    const rX = -(mouseY / (height / 2)) * 12;
    const rY = (mouseX / (width / 2)) * 12;
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 transition-all duration-300 ease-out ${className}`}
      style={{
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
}

// 3D Canvas Particles Network
function ParticleCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 120;
    const particles: Array<{ x: number; y: number; z: number; size: number; color: string }> = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 1200,
        z: Math.random() * 1000,
        size: Math.random() * 2 + 1.2,
        color: i % 3 === 0 ? 'rgba(99, 102, 241, 0.45)' : i % 3 === 1 ? 'rgba(192, 132, 252, 0.45)' : 'rgba(56, 189, 248, 0.45)',
      });
    }

    let angleX = 0.0005;
    let angleY = 0.001;
    const fov = 450;

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.0008;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.0008;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const targetAngleX = mouseY * 0.03;
      const targetAngleY = mouseX * 0.03;
      angleX += (targetAngleX - angleX) * 0.05;
      angleY += (targetAngleY - angleY) * 0.05;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const projected: Array<{ x: number; y: number; size: number; color: string; z: number }> = [];

      for (let p of particles) {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;

        let y1 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        p.x = x1;
        p.y = y1;
        p.z = z2;

        const scale = fov / (fov + z2);
        const projX = x1 * scale + width / 2;
        const projY = y1 * scale + height / 2;

        if (projX >= 0 && projX <= width && projY >= 0 && projY <= height) {
          projected.push({ x: projX, y: projY, size: p.size * scale * 2, color: p.color, z: z2 });
        }
      }

      projected.sort((a, b) => b.z - a.z);

      ctx.lineWidth = 0.6;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.18;
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      for (let p of projected) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-0" />;
}

// Static Explanation Pipeline Flow for Landing Page
function ReconciliationPipelineFlow() {
  return (
    <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-xl overflow-hidden relative max-w-4xl mx-auto mt-16 animate-fade-in z-10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
        <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span>How Revalto Processes Financial Data</span>
      </h3>

      <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-6 md:gap-12">
        {/* SVG connection lines behind panels */}
        <div className="absolute inset-0 pointer-events-none hidden md:block z-0">
          <svg className="w-full h-full" viewBox="0 0 800 160" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            {/* Line 1: Left Top to Middle */}
            <path
              d="M 220 30 Q 300 30, 340 60"
              fill="none"
              stroke="url(#line-grad-indigo)"
              strokeWidth="2"
              className="animate-flow-dash"
            />
            {/* Line 2: Left Middle to Middle */}
            <path
              d="M 220 80 L 340 80"
              fill="none"
              stroke="url(#line-grad-indigo)"
              strokeWidth="2"
              className="animate-flow-dash"
            />
            {/* Line 3: Left Bottom to Middle */}
            <path
              d="M 220 130 Q 300 130, 340 100"
              fill="none"
              stroke="url(#line-grad-indigo)"
              strokeWidth="2"
              className="animate-flow-dash"
            />
            {/* Line 4: Middle to Right Top */}
            <path
              d="M 480 70 Q 560 50, 600 50"
              fill="none"
              stroke="url(#line-grad-emerald)"
              strokeWidth="2.5"
              className="animate-flow-dash"
            />
            {/* Line 5: Middle to Right Bottom */}
            <path
              d="M 480 90 Q 560 110, 600 110"
              fill="none"
              stroke="url(#line-grad-rose)"
              strokeWidth="2.5"
              className="animate-flow-dash"
            />

            <defs>
              <linearGradient id="line-grad-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4338ca" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="line-grad-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="line-grad-rose" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Column 1: Source Datasets */}
        <div className="flex-1 min-w-[200px] z-10 space-y-3">
          <div className="text-center font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">Ingestion Layer</div>
          
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">ERP Ledger</span>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">300 rows</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">Payment Gateway</span>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">290 rows</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">Bank Statement</span>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">275 rows</span>
          </div>
        </div>

        {/* Column 2: 5-Level Matching Engine */}
        <div className="flex-1 min-w-[200px] z-10 flex flex-col justify-center">
          <div className="text-center font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">Processing Engine</div>
          
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 shadow-lg text-center relative pulse-border-glow">
            <div className="absolute top-2 right-2 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400 animate-bounce" />
            </div>
            <span className="text-xs font-extrabold text-indigo-300 block mb-1">5-Level Matcher</span>
            <p className="text-[10px] text-indigo-200/90 leading-relaxed mb-3">
              Performs deterministic cascading matching based on reference links, gateway fees, and timing tolerances.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-mono text-indigo-200">
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Exact ID</span>
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Ref Link</span>
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Fee Calc</span>
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Date Tol</span>
            </div>
          </div>
        </div>

        {/* Column 3: Outcomes / Targets */}
        <div className="flex-1 min-w-[200px] z-10 space-y-3 flex flex-col justify-center">
          <div className="text-center font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">Outcome Classifier</div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/25 shadow-sm hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-200">Matched Clean</span>
            </div>
            <span className="text-xs font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              247 (82%)
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/25 shadow-sm hover:border-rose-500/40 transition-all">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-200">Exceptions</span>
            </div>
            <span className="text-xs font-extrabold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
              53 (18%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header Navigation */}
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <span className="font-bold text-lg tracking-tight text-white">Revalto</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                MVP 1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#architecture" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#audience" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              For Whom
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center gap-2"
            >
              <span>Judge / Demo Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-24 relative overflow-hidden">
        <ParticleCanvas />
        {/* Animated Background Mesh Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Multi-Source Financial Reconciliation Engine + Evidence-Based AI</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
              Deterministic Truth for Your <br />
              <span className="gradient-text">Financial Reconciliations</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
              Reconcile ERP Invoices, Payment Gateways, and Bank Settlements in seconds. Code determines financial accuracy, database preserves exact evidence, and AI retrieves & explains root causes.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-3"
              >
                <span>Try Instant Demo Account</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-700 transition-all"
              >
                Explore Product Architecture
              </Link>
            </div>
          </motion.div>

          {/* Interactive Core Principle Card */}
          <div className="mt-16 max-w-4xl mx-auto glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
              <TiltCard className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-200">1. Code Match</h4>
                <p className="text-xs text-slate-400 mt-1">Deterministic 5-level algorithms establish financial truth.</p>
              </TiltCard>

              <TiltCard className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-200">2. DB Evidence</h4>
                <p className="text-xs text-slate-400 mt-1">Row-level isolation stores exact matching breakdowns.</p>
              </TiltCard>

              <TiltCard className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                  <Bot className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-200">3. AI Copilot</h4>
                <p className="text-xs text-slate-400 mt-1">Tool calls retrieve & explain discrepancies without hallucination.</p>
              </TiltCard>

              <TiltCard className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-200">4. Dashboard</h4>
                <p className="text-xs text-slate-400 mt-1">Visual health scores, flow diagrams & audit-ready reports.</p>
              </TiltCard>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Flow Architecture */}
      <section id="architecture" className="py-20 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Complete End-to-End Product Flow
            </h2>
            <p className="text-slate-400 mt-4 text-base">
              From multi-source CSV uploads to automated exception classification and AI investigation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TiltCard className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4 border border-indigo-500/30">
                01
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Upload & Source Detection</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Upload ERP/Ledger, Payment Gateway, and Bank Settlement CSV files. System automatically identifies file types and validates schemas using Zod.
              </p>
            </TiltCard>

            <TiltCard className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg mb-4 border border-purple-500/30">
                02
              </div>
              <h3 className="text-lg font-bold text-white mb-2">5-Level Match Engine</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Deterministic matching checks exact IDs, linked references, gateway fee math, timing lags, and duplicate payments with 100% precision.
              </p>
            </TiltCard>

            <TiltCard className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4 border border-emerald-500/30">
                03
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Copilot & Resolution</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ask questions like <em>"Why is transaction #17 mismatched?"</em>. The AI queries exact DB evidence and provides clear audit explanations.
              </p>
            </TiltCard>
          </div>

          <ReconciliationPipelineFlow />
        </div>
      </section>

      {/* For Whom Section */}
      <section id="audience" className="py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Designed For Financial Teams & Auditors
            </h2>
            <p className="text-slate-400 mt-4 text-base">
              Eliminate manual Excel VLOOKUP matching, fee confusion, and unexplainable discrepancies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4">
              <Building2 className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-slate-200 text-base">CFOs & Finance Controllers</h4>
                <p className="text-sm text-slate-400 mt-2">
                  Gain instant visibility into monthly match rates, uncollected settlements, and gateway fee drains across all payment channels.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4">
              <Scale className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-slate-200 text-base">Auditors & Compliance</h4>
                <p className="text-sm text-slate-400 mt-2">
                  Complete audit-trail logs with exact line-by-line matching evidence and PDF/CSV compliance report generation.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4">
              <Lock className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-slate-200 text-base">Fintech & E-Commerce</h4>
                <p className="text-sm text-slate-400 mt-2">
                  Reconcile millions of payment events against bank settlements with deterministic multi-tenant security isolation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-16 border-t border-slate-800/80 bg-slate-950 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-white">Experience Revalto</h2>
          <p className="text-slate-400 mt-3 text-sm">
            Sign in with the preloaded demo account <code>demo@aifinance.com</code> to explore the 150-event reconciliation.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition-all shadow-xl shadow-indigo-600/30 inline-flex items-center gap-3"
            >
              <span>Launch Demo Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-xs text-slate-600 mt-12">
            © 2026 Revalto MVP. Built with Next.js 14, Tailwind CSS & Prisma.
          </p>
        </div>
      </footer>
    </div>
  );
}
