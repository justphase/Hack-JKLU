"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function GridPattern({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />
      {/* Radial fade from center-top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.04)_0%,transparent_60%)]" />
      {/* Bottom fade to bg */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-[#09090b]/80" />
    </div>
  );
}

function FloatingOrb({
  className,
  delay = 0,
  size = 300,
  color = "rgba(139, 92, 246, 0.04)",
}: {
  className?: string;
  delay?: number;
  size?: number;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, delay }}
      className={cn("absolute rounded-full pointer-events-none", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(40px)",
      }}
    >
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="w-full h-full"
      />
    </motion.div>
  );
}

function HeroBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#09090b]">
      <GridPattern />

      {/* Ambient orbs — very subtle */}
      <FloatingOrb
        delay={0}
        size={500}
        color="rgba(139, 92, 246, 0.03)"
        className="top-[10%] left-[20%]"
      />
      <FloatingOrb
        delay={0.5}
        size={400}
        color="rgba(59, 130, 246, 0.02)"
        className="top-[60%] right-[10%]"
      />
      <FloatingOrb
        delay={1}
        size={300}
        color="rgba(167, 139, 250, 0.02)"
        className="bottom-[20%] left-[60%]"
      />

      {children}
    </div>
  );
}

export { HeroBackground, GridPattern, FloatingOrb };
