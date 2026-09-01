'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className = '', size = 40, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          {/* Cyan to Blue gradient for the outer circular ring */}
          <linearGradient id="ringGradient" x1="20" y1="20" x2="160" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" /> {/* Emerald */}
            <stop offset="50%" stopColor="#06b6d4" /> {/* Cyan */}
            <stop offset="100%" stopColor="#3b82f6" /> {/* Blue */}
          </linearGradient>
          {/* Green/Teal gradient for the bar charts */}
          <linearGradient id="barGradient" x1="120" y1="160" x2="185" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Outer Circle Ring wrapper (almost closed, starts bottom-left, ends top-right) */}
        <path
          d="M 90,165 A 75,75 0 1,1 150,55"
          stroke="url(#ringGradient)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Up-Right Growth Arrow at the end of the ring */}
        <path
          d="M 135,70 L 175,35 M 175,35 L 145,32 M 175,35 L 170,65"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Stylized White 'R' in the Center */}
        <text
          x="88"
          y="126"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="82"
          fontWeight="900"
          fill="#ffffff"
          textAnchor="middle"
        >
          R
        </text>

        {/* 3 Growth Bar Columns */}
        {/* Bar 1 (Shortest) */}
        <rect x="122" y="125" width="12" height="35" rx="4" fill="url(#barGradient)" />
        {/* Bar 2 (Medium) */}
        <rect x="142" y="105" width="12" height="55" rx="4" fill="url(#barGradient)" />
        {/* Bar 3 (Tallest) */}
        <rect x="162" y="85" width="12" height="75" rx="4" fill="url(#barGradient)" />
      </svg>
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-white text-base tracking-wider leading-none">REVALTO</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">AI Finance Controller</span>
        </div>
      )}
    </div>
  );
}
export default Logo;
