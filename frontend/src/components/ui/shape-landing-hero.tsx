"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.08]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.05)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-gray-950">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.03] via-transparent to-emerald-500/[0.03]" />

      {/* Floating shapes */}
      <ElegantShape
        delay={0.3}
        width={600}
        height={140}
        rotate={12}
        gradient="from-green-500/[0.07]"
        className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
      />
      <ElegantShape
        delay={0.5}
        width={500}
        height={120}
        rotate={-15}
        gradient="from-emerald-500/[0.07]"
        className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
      />
      <ElegantShape
        delay={0.4}
        width={300}
        height={80}
        rotate={-8}
        gradient="from-teal-500/[0.07]"
        className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
      />
      <ElegantShape
        delay={0.6}
        width={200}
        height={60}
        rotate={20}
        gradient="from-green-400/[0.06]"
        className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
      />
      <ElegantShape
        delay={0.7}
        width={150}
        height={40}
        rotate={-25}
        gradient="from-emerald-400/[0.06]"
        className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
      />

      {/* Top/bottom fog */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/80 pointer-events-none" />

      {children}
    </div>
  );
}

export { HeroBackground, ElegantShape };
