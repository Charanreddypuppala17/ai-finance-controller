'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';
import {
  Zap,
  Bot,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Scale,
  Building2,
  Lock,
  Menu,
  X,
  Layers,
  FileCheck,
} from 'lucide-react';

// Interactive 3D Card Tilt Component (desktop tilt, smooth flat on mobile)
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = React.useState(0);
  const [rotateY, setRotateY] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return; // disable on mobile
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    const rX = -(mouseY / (height / 2)) * 10;
    const rY = (mouseX / (width / 2)) * 10;
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
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
}

// 3D Canvas Particles Network (responsive & light on mobile)
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
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 40 : 100;
    const particles: Array<{ x: number; y: number; z: number; size: number; color: string }> = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * (isMobile ? 600 : 1200),
        y: (Math.random() - 0.5) * (isMobile ? 600 : 1200),
        z: Math.random() * 800,
        size: Math.random() * 1.8 + 1,
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

      if (!isMobile) {
        ctx.lineWidth = 0.6;
        for (let i = 0; i < projected.length; i++) {
          for (let j = i + 1; j < projected.length; j++) {
            const dx = projected[i].x - projected[j].x;
            const dy = projected[i].y - projected[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110) {
              const alpha = (1 - dist / 110) * 0.15;
              ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(projected[i].x, projected[i].y);
              ctx.lineTo(projected[j].x, projected[j].y);
              ctx.stroke();
            }
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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0" />;
}

// Explanation Pipeline Flow for Landing Page (Fully Responsive)
function ReconciliationPipelineFlow() {
  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-xl overflow-hidden relative max-w-4xl mx-auto mt-12 sm:mt-16 animate-fade-in z-10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <h3 className="text-xs sm:text-sm font-bold text-white mb-6 flex items-center gap-2">
        <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span>How Revalto Processes Financial Data</span>
      </h3>

      <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-5 md:gap-8">
        {/* Column 1: Source Datasets */}
        <div className="flex-1 min-w-0 z-10 space-y-2.5">
          <div className="text-center md:text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            1. Ingestion Layer
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate">ERP Ledger</span>
            </div>
            <span className="text-[11px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
              300 rows
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate">Payment Gateway</span>
            </div>
            <span className="text-[11px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
              290 rows
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-pulse flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate">Bank Statement</span>
            </div>
            <span className="text-[11px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
              275 rows
            </span>
          </div>
        </div>

        {/* Column 2: 5-Level Matching Engine */}
        <div className="flex-1 min-w-0 z-10 flex flex-col justify-center">
          <div className="text-center font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            2. Processing Engine
          </div>
          
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 shadow-lg text-center relative pulse-border-glow">
            <div className="absolute top-2 right-2 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400 animate-bounce" />
            </div>
            <span className="text-xs font-extrabold text-indigo-300 block mb-1">5-Level Matcher</span>
            <p className="text-[10px] text-indigo-200/90 leading-relaxed mb-3">
              Deterministic matching based on reference links, gateway fees, and timing tolerances.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-mono text-indigo-200">
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Exact ID</span>
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Ref Link</span>
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Fee Math</span>
              <span className="px-1.5 py-0.5 bg-indigo-900/40 rounded border border-indigo-500/20">Date Tol</span>
            </div>
          </div>
        </div>

        {/* Column 3: Outcomes / Targets */}
        <div className="flex-1 min-w-0 z-10 space-y-2.5 flex flex-col justify-center">
          <div className="text-center md:text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            3. Outcome Classifier
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/25 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-200">Matched Clean</span>
            </div>
            <span className="text-xs font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              247 (82%)
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/40 border border-rose-500/25 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header Navigation */}
      <header className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Logo size={32} />
            <div className="flex items-center">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white">Revalto</span>
              <span className="ml-1.5 sm:ml-2 text-[9px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI Controller
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#architecture" className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#audience" className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">
              For Whom
            </Link>
            <Link
              href="/login"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-xs sm:text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center gap-2"
            >
              <span>Demo Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Actions: Quick Demo Button + Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1"
            >
              <span>Demo</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 bg-slate-900 border border-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-b border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-3 shadow-2xl"
            >
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-200 hover:text-indigo-400 transition-colors border-b border-slate-900"
              >
                Features
              </Link>
              <Link
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-200 hover:text-indigo-400 transition-colors border-b border-slate-900"
              >
                How It Works
              </Link>
              <Link
                href="#audience"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-200 hover:text-indigo-400 transition-colors border-b border-slate-900"
              >
                For Whom
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 mt-2"
              >
                <span>Launch Demo Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 relative overflow-hidden">
        <ParticleCanvas />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[700px] h-[260px] sm:h-[400px] bg-indigo-600/15 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[240px] sm:w-[400px] h-[180px] sm:h-[300px] bg-purple-600/15 rounded-full blur-[90px] sm:blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-[11px] sm:text-xs font-semibold mb-5 sm:mb-6 shadow-inner">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>3-Way Reconciliation Engine + Evidence-Based AI Copilot</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
              Deterministic Truth for Your <br className="hidden sm:inline" />
              <span className="gradient-text">Financial Reconciliations</span>
            </h1>

            <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed px-2">
              Reconcile ERP Invoices, Payment Gateways, and Bank Settlements in seconds. Code determines financial accuracy, database preserves exact evidence, and AI explains root causes.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
              <Link
                href="/login"
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 sm:gap-3"
              >
                <span>Try Instant Demo Account</span>
                <ArrowRight className="w-4 h-4 sm:w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm sm:text-base border border-slate-700 transition-all text-center"
              >
                Explore Product Architecture
              </Link>
            </div>
          </motion.div>

          {/* Core Principle Cards Grid */}
          <div className="mt-12 sm:mt-16 max-w-4xl mx-auto glass-panel rounded-2xl p-4 sm:p-8 border border-slate-800 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
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
      <section id="architecture" className="py-12 sm:py-20 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Complete End-to-End Product Flow
            </h2>
            <p className="text-slate-400 mt-2 sm:mt-4 text-xs sm:text-base">
              From multi-source CSV uploads to automated exception classification and AI investigation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
            <TiltCard className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-base sm:text-lg mb-4 border border-indigo-500/30">
                01
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Upload & Source Detection</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Upload ERP/Ledger, Payment Gateway, and Bank Settlement CSV files. System automatically identifies file types and validates schemas using Zod.
              </p>
            </TiltCard>

            <TiltCard className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-base sm:text-lg mb-4 border border-purple-500/30">
                02
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">5-Level Match Engine</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Deterministic matching checks exact IDs, linked references, gateway fee math, timing lags, and duplicate payments with 100% precision.
              </p>
            </TiltCard>

            <TiltCard className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-base sm:text-lg mb-4 border border-emerald-500/30">
                03
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">AI Copilot & Resolution</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ask questions like <em>"Why is transaction #17 mismatched?"</em>. The AI queries exact DB evidence and provides clear audit explanations.
              </p>
            </TiltCard>
          </div>

          <ReconciliationPipelineFlow />
        </div>
      </section>

      {/* For Whom Section */}
      <section id="audience" className="py-12 sm:py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Designed For Financial Teams & Auditors
            </h2>
            <p className="text-slate-400 mt-2 sm:mt-4 text-xs sm:text-base">
              Eliminate manual Excel VLOOKUP matching, fee confusion, and unexplainable discrepancies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4">
              <Building2 className="w-7 sm:w-8 h-7 sm:h-8 text-indigo-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm sm:text-base">CFOs & Finance Controllers</h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Gain instant visibility into monthly match rates, uncollected settlements, and gateway fee drains across all payment channels.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4">
              <Scale className="w-7 sm:w-8 h-7 sm:h-8 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm sm:text-base">Auditors & Compliance</h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Complete audit-trail logs with exact line-by-line matching evidence and PDF/CSV compliance report generation.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-4">
              <Lock className="w-7 sm:w-8 h-7 sm:h-8 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm sm:text-base">Fintech & E-Commerce</h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Reconcile millions of payment events against bank settlements with deterministic multi-tenant security isolation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-12 sm:py-16 border-t border-slate-800/80 bg-slate-950 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Experience Revalto</h2>
          <p className="text-slate-400 mt-2 sm:mt-3 text-xs sm:text-sm">
            Sign in with the preloaded demo account <code>demo@aifinance.com</code> to explore the 150-event reconciliation.
          </p>
          <div className="mt-6 sm:mt-8">
            <Link
              href="/login"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm sm:text-base transition-all shadow-xl shadow-indigo-600/30 inline-flex items-center gap-2 sm:gap-3"
            >
              <span>Launch Demo Dashboard</span>
              <ArrowRight className="w-4 h-4 sm:w-5 h-5" />
            </Link>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 mt-10 sm:mt-12">
            © 2026 Revalto. Built with Next.js 14, Tailwind CSS, Supabase & Google Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
