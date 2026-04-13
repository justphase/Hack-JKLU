"use client";

import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Lock, Zap, Eye, GitBranch, ChevronRight, AlertTriangle, Shield, Scan, FileSearch, KeyRound, Terminal, ExternalLink, Check } from "lucide-react";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { HeroBackground } from "@/components/ui/shape-landing-hero";
import { AnimatedButton, AnimatedButtonOutline } from "@/components/ui/animated-button";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

/* ─── Animated counter ─── */
function AnimatedNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="tabular-nums"
    >
      {value}{suffix}
    </motion.span>
  );
}

/* ─── Feature Card with canvas reveal ─── */
function FeatureCard({
  icon,
  title,
  desc,
  colors,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  colors: number[][];
  tag?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-hover relative bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 overflow-hidden cursor-default group"
      style={{ minHeight: "200px" }}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <CanvasRevealEffect
              animationSpeed={5}
              containerClassName="bg-transparent"
              colors={colors}
              opacities={[0.03, 0.03, 0.04, 0.04, 0.05, 0.05, 0.06, 0.06, 0.08, 0.1]}
              dotSize={2}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex p-2 rounded-lg border border-white/[0.06] bg-white/[0.03]">
            {icon}
          </div>
          {tag && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 border border-white/[0.06] rounded-full px-2 py-0.5">
              {tag}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-white text-[15px] mb-2">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Step Card ─── */
function StepCard({
  step,
  icon,
  title,
  desc,
  delay,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="relative p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] group hover:border-white/[0.1] transition-all duration-300"
    >
      <span className="text-[64px] font-black absolute top-3 right-4 text-white/[0.02] leading-none select-none">
        {step}
      </span>
      <div className="inline-flex p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold mb-2 text-white">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative noise-overlay">
      <HeroBackground />

      {/* ── Navigation ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-10 py-4 border-b border-white/[0.06] backdrop-blur-xl bg-[#09090b]/70">
        <div className="flex items-center gap-8">
          {/* Logo text — no icon */}
          <Link href="/" className="flex items-center gap-1">
            <span className="text-[15px] font-bold tracking-tight text-white">
              Oracle<span className="text-zinc-500 font-normal">&apos;s</span> Decree
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#how" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.03]">
              How it works
            </a>
            <a href="#engines" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.03]">
              Engines
            </a>
            <a href="#trust" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.03]">
              Security
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isLoaded ? (
            <div className="w-20 h-8 bg-zinc-800/50 rounded-lg animate-pulse" />
          ) : isSignedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <AnimatedButton title="Dashboard" size="sm" />
              </Link>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/sign-in" className="text-[13px] text-zinc-500 hover:text-white transition-colors px-3 py-1.5">
                Sign in
              </Link>
              <Link href="/sign-up">
                <AnimatedButton title="Get Started" size="sm" icon={<ArrowRight size={14} />} />
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 pt-24 sm:pt-32 pb-20">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-16">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 bg-white/[0.03] border border-white/[0.06] text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse-dot" />
                <span>Security scanner for modern codebases</span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-[-0.03em] mb-6">
                <span className="text-white">
                  Ship secure code,
                </span>
                <br />
                <span className="text-zinc-500">
                  not vulnerabilities.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-zinc-500 leading-relaxed mb-10 max-w-lg">
                Unified SAST, SCA, API Security and Secrets detection.
                One scan. One risk score. Exact fix commands.
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                  <AnimatedButton
                    icon={<ArrowRight size={15} />}
                    title="Start scanning"
                    size="lg"
                  />
                </Link>
                <Link href={isSignedIn ? "/dashboard" : "/sign-in"}>
                  <AnimatedButtonOutline
                    title={isSignedIn ? "Dashboard" : "Sign in"}
                    size="lg"
                  />
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-6 mt-10 flex-wrap">
                {[
                  "SAST Engine",
                  "Dependency Audit",
                  "API Security",
                  "Secrets Detection",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <Check size={12} className="text-zinc-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right side — Risk Score Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="hidden lg:block w-[340px] shrink-0"
          >
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Risk Score</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/15">
                  HIGH
                </span>
              </div>

              {/* Score */}
              <p className="text-5xl font-black text-white mb-5 tracking-tight">
                72<span className="text-lg font-normal text-zinc-600">/100</span>
              </p>

              {/* Severity breakdown */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  { n: "2", l: "Critical", c: "text-red-400" },
                  { n: "5", l: "High", c: "text-amber-400" },
                  { n: "8", l: "Medium", c: "text-yellow-400" },
                  { n: "12", l: "Low", c: "text-blue-400" },
                ].map((s) => (
                  <div key={s.l} className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className={`text-lg font-bold ${s.c}`}>{s.n}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Findings */}
              <div className="space-y-2">
                {[
                  { text: "eval() — code execution risk", severity: "critical", icon: AlertTriangle },
                  { text: "AWS_SECRET_KEY in .env", severity: "high", icon: KeyRound },
                  { text: "lodash@4.17.15 — CVE-2021-23337", severity: "high", icon: FileSearch },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] group hover:border-white/[0.08] transition-colors"
                  >
                    <item.icon size={12} className="text-zinc-500 shrink-0" />
                    <span className="text-[12px] text-zinc-400 truncate">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Terminal-style footer */}
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-mono">
                  <Terminal size={10} />
                  <span>scan completed in 12.4s</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="relative z-10 border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "27", label: "Vulnerability patterns", suffix: "+" },
            { value: "4", label: "Scan engines" },
            { value: "<60", label: "Seconds per scan", suffix: "s" },
            { value: "100", label: "Risk score precision", suffix: "%" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-xs text-zinc-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 px-6 lg:px-10 py-20 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-3">
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-white">
              Three steps to a secure codebase
            </h2>
            <p className="text-zinc-500 text-sm mb-14 max-w-md">
              From code upload to blockchain-verified report in under a minute.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              step="01"
              icon={<GitBranch size={18} className="text-zinc-400" />}
              title="Connect or upload"
              desc="Link your GitHub repo or drag-and-drop source files. We support JS, TS, Python, package.json, OpenAPI specs and .env files."
              delay={0}
            />
            <StepCard
              step="02"
              icon={<Zap size={18} className="text-zinc-400" />}
              title="Multi-engine scan"
              desc="Four engines run in parallel — SAST, SCA, API audit, secrets detection. Results in under 60 seconds."
              delay={0.1}
            />
            <StepCard
              step="03"
              icon={<Shield size={18} className="text-zinc-400" />}
              title="Fix & verify"
              desc="Get a prioritized risk score, exact fix commands, and a tamper-proof report stored on IPFS + Polygon blockchain."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── Engines ── */}
      <section id="engines" className="relative z-10 px-6 lg:px-10 py-20 sm:py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-3">
              Scan Engines
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-white">
              Four engines. One risk score.
            </h2>
            <p className="text-zinc-500 text-sm mb-14 max-w-lg">
              Every scan runs all engines in parallel, cross-correlates findings, and outputs a single 0–100 risk score.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Scan size={18} className="text-violet-400" />}
              title="SAST Engine"
              desc="AST-based pattern matching across JS, TS and Python. Catches eval(), innerHTML, SQL injection, prototype pollution and 22+ more patterns."
              colors={[[139, 92, 246]]}
              tag="Static Analysis"
            />
            <FeatureCard
              icon={<FileSearch size={18} className="text-blue-400" />}
              title="Dependency Audit"
              desc="Checks npm/yarn lockfiles against OSV.dev and GitHub Advisory Database. Flags outdated packages with known CVEs."
              colors={[[59, 130, 246]]}
              tag="SCA"
            />
            <FeatureCard
              icon={<Zap size={18} className="text-amber-400" />}
              title="API Security"
              desc="Validates OpenAPI specs against the OWASP API Security Top 10. Missing auth, excessive data exposure, rate limiting gaps."
              colors={[[245, 158, 11]]}
              tag="OWASP"
            />
            <FeatureCard
              icon={<KeyRound size={18} className="text-rose-400" />}
              title="Secrets Detection"
              desc="Shannon entropy analysis + regex pattern matching. Catches hardcoded API keys, tokens and private keys before they leak."
              colors={[[244, 63, 94]]}
              tag="Entropy"
            />
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section id="trust" className="relative z-10 px-6 lg:px-10 py-16 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-3">
              Security & Privacy
            </p>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Your code never leaves, your report always stays.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Lock size={16} className="text-zinc-400" />,
                title: "Zero retention",
                text: "Source files are deleted immediately after the scan completes.",
              },
              {
                icon: <Shield size={16} className="text-zinc-400" />,
                title: "IPFS storage",
                text: "Reports are pinned to a decentralized network for tamper-proof access.",
              },
              {
                icon: <Eye size={16} className="text-zinc-400" />,
                title: "Blockchain verified",
                text: "Report hashes are recorded on Polygon for cryptographic proof of integrity.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className="inline-flex p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-3">
                  {item.icon}
                </div>
                <h3 className="text-[14px] font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 lg:px-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 text-white">
              Ready to secure your code?
            </h2>
            <p className="text-zinc-500 text-sm mb-8">
              Run your first scan in under a minute. No credit card required.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                <AnimatedButton
                  icon={<ChevronRight size={15} />}
                  title={isSignedIn ? "Go to Dashboard" : "Start scanning free"}
                  size="lg"
                />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-6 lg:px-10 py-5 flex items-center justify-between text-[11px] border-t border-white/[0.06] text-zinc-600">
        <span className="font-medium text-zinc-500">
          Oracle&apos;s Decree
        </span>
        <span>Built for developers who ship fast and stay secure.</span>
      </footer>
    </div>
  );
}
