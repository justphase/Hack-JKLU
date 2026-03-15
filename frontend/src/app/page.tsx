"use client";

import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Shield, ArrowRight, Lock, Zap, Eye, GitBranch, ChevronRight, AlertTriangle } from "lucide-react";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { HeroBackground } from "@/components/ui/shape-landing-hero";
import { AnimatedButton, AnimatedButtonOutline } from "@/components/ui/animated-button";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

function FeatureCard({
  icon,
  title,
  desc,
  colors,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  colors: number[][];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-hover relative bg-gray-900/80 border border-gray-800 rounded-xl p-6 overflow-hidden cursor-default backdrop-blur-sm"
      style={{ minHeight: "180px" }}
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
              opacities={[0.1, 0.1, 0.1, 0.15, 0.15, 0.15, 0.2, 0.2, 0.2, 0.3]}
              dotSize={2}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-10">
        <div className="inline-flex p-2 rounded-lg border border-gray-700 bg-gray-800/50 mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
      {/* ── Floating shapes background ── */}
      <HeroBackground />

      {/* ── Canvas dot-matrix layer ── */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <CanvasRevealEffect
          animationSpeed={0.3}
          containerClassName="bg-transparent"
          colors={[[34, 197, 94], [22, 163, 74]]}
          opacities={[0.02, 0.02, 0.03, 0.03, 0.04, 0.04, 0.05, 0.05, 0.06, 0.08]}
          dotSize={2}
          showGradient={false}
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-gray-800/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Shield size={20} className="text-green-400" strokeWidth={2.5} />
          <span className="text-base font-semibold tracking-tight gradient-text">Oracle&apos;s Decree</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#how" className="text-sm text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">How it works</a>
          <a href="#engines" className="text-sm text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">Engines</a>
          {!isLoaded ? (
            <div className="w-20 h-8 bg-gray-800 rounded-lg animate-pulse" />
          ) : isSignedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <AnimatedButton icon={<Shield size={16} />} title="Dashboard" size="sm" />
              </Link>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/sign-up">
                <AnimatedButton title="Get Started" size="sm" />
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pt-28 pb-24">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-16">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 bg-white/[0.03] border border-white/[0.08] text-green-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Security scanner for modern codebases
              </div>

              <h1 className="text-5xl md:text-[3.75rem] font-extrabold leading-[1.08] tracking-tight mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                  Stop shipping
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-300 via-white/90 to-emerald-300">
                  vulnerabilities.
                </span>
              </h1>

              <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-md">
                Unified SAST, SCA, API Security and Secrets detection.
                One scan. One risk score. Exact fix commands.
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                  <AnimatedButton
                    icon={<ArrowRight size={16} />}
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
            </motion.div>
          </div>

          {/* Right side — mini preview card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block w-80"
          >
            <div className="card-hover bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Risk Score</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/25">High</span>
              </div>
              <p className="text-5xl font-black text-orange-400 mb-4">72</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { n: "2", l: "Crit", c: "text-red-400" },
                  { n: "5", l: "High", c: "text-orange-400" },
                  { n: "8", l: "Med", c: "text-yellow-400" },
                  { n: "12", l: "Low", c: "text-blue-400" },
                ].map((s) => (
                  <div key={s.l} className="text-center">
                    <p className={`text-lg font-black ${s.c}`}>{s.n}</p>
                    <p className="text-[10px] text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {[
                  { text: "eval() — code exec risk", color: "text-red-400", bg: "bg-red-500/5 border-red-500/10" },
                  { text: "AWS key in .env", color: "text-orange-400", bg: "bg-orange-500/5 border-orange-500/10" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 border rounded px-3 py-2 ${item.bg}`}>
                    <AlertTriangle size={12} className={item.color} />
                    <span className="text-xs text-gray-300 truncate">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 px-8 py-20 border-t border-gray-800/40">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-3">How it works</p>
          <h2 className="text-2xl font-bold mb-12">Three steps to a secure codebase</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: <GitBranch size={20} className="text-green-400" />,
                title: "Connect or upload",
                desc: "Link your GitHub repo or drag-and-drop source files. We support JS, TS, Python, package.json, OpenAPI specs and .env files.",
              },
              {
                step: "02",
                icon: <Zap size={20} className="text-emerald-400" />,
                title: "Multi-engine scan",
                desc: "Four engines run in parallel — SAST, SCA, API audit, secrets detection. Results in under 60 seconds.",
              },
              {
                step: "03",
                icon: <Shield size={20} className="text-teal-400" />,
                title: "Fix & verify",
                desc: "Get a prioritized risk score, exact fix commands, and a tamper-proof report stored on IPFS + Polygon blockchain.",
              },
            ].map((item) => (
              <div key={item.step} className="card-hover relative p-6 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                <span className="text-6xl font-black absolute top-4 right-5 text-green-500/5">
                  {item.step}
                </span>
                <div className="inline-flex p-2 rounded-lg bg-gray-800/80 mb-4">{item.icon}</div>
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Engines (with Canvas Reveal on hover) ── */}
      <section id="engines" className="relative z-10 px-8 py-20 border-t border-gray-800/40">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-3">Scan engines</p>
          <h2 className="text-2xl font-bold mb-4">Four engines. One risk score.</h2>
          <p className="text-gray-500 mb-12 max-w-lg">Every scan runs all engines in parallel, cross-correlates findings, and outputs a single 0–100 risk score.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Shield size={20} className="text-purple-400" />}
              title="SAST Engine"
              desc="AST-based pattern matching across JS, TS and Python. Catches eval(), innerHTML, SQL injection, prototype pollution and 22 more patterns."
              colors={[[139, 92, 246]]}
            />
            <FeatureCard
              icon={<Lock size={20} className="text-blue-400" />}
              title="Dependency Audit"
              desc="Checks npm/yarn lockfiles against OSV.dev and GitHub Advisory Database. Flags outdated packages with known CVEs."
              colors={[[59, 130, 246]]}
            />
            <FeatureCard
              icon={<Zap size={20} className="text-amber-400" />}
              title="API Security"
              desc="Validates OpenAPI specs against the OWASP API Security Top 10. Missing auth, excessive data exposure, rate limiting gaps."
              colors={[[245, 158, 11]]}
            />
            <FeatureCard
              icon={<AlertTriangle size={20} className="text-red-400" />}
              title="Secrets Detection"
              desc="Shannon entropy analysis + regex pattern matching. Catches hardcoded API keys, tokens and private keys before they leak."
              colors={[[239, 68, 68]]}
            />
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="relative z-10 px-8 py-14 border-t border-gray-800/40">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-10">
          {[
            { icon: <Lock size={16} className="text-green-400" />, text: "Files deleted after scan" },
            { icon: <Shield size={16} className="text-green-400" />, text: "Reports stored on IPFS" },
            { icon: <Eye size={16} className="text-green-400" />, text: "Verified on Polygon blockchain" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-8 py-24 border-t border-gray-800/40">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to secure your code?</h2>
          <p className="text-gray-500 mb-8">Run your first scan in under a minute. No credit card required.</p>
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"} className="inline-block">
            <AnimatedButton
              icon={<ChevronRight size={16} />}
              title={isSignedIn ? "Go to Dashboard" : "Start scanning free"}
              size="lg"
            />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-8 py-6 flex items-center justify-between text-xs border-t border-gray-800/40 text-gray-600">
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-green-400/40" />
          <span>Oracle&apos;s Decree</span>
        </div>
        <span>Built for developers who ship fast and stay secure</span>
      </footer>
    </div>
  );
}
