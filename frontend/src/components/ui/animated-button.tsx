"use client";

import React from "react";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  icon,
  title,
  subtitle,
  size = "md",
  className = "",
  ...props
}) => {
  const sizes = {
    sm: "px-4 py-2 rounded-lg text-[13px]",
    md: "px-5 py-2.5 rounded-lg text-sm",
    lg: "px-6 py-3 rounded-lg text-sm",
  };

  return (
    <button
      {...props}
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
                  hover:scale-[1.02] active:scale-[0.98]
                  ${sizes[size]}
                  bg-white text-zinc-900
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${className}`}
    >
      {/* Subtle shimmer on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {icon && (
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            {icon}
          </span>
        )}
        <div className={subtitle ? "text-left" : ""}>
          <p className="font-medium leading-tight">{title}</p>
          {subtitle && (
            <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );
};

/* Secondary variant — ghost / outline style */
export const AnimatedButtonOutline: React.FC<AnimatedButtonProps> = ({
  icon,
  title,
  subtitle,
  size = "md",
  className = "",
  ...props
}) => {
  const sizes = {
    sm: "px-4 py-2 rounded-lg text-[13px]",
    md: "px-5 py-2.5 rounded-lg text-sm",
    lg: "px-6 py-3 rounded-lg text-sm",
  };

  return (
    <button
      {...props}
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
                  hover:scale-[1.02] active:scale-[0.98]
                  ${sizes[size]}
                  border border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-white/[0.02]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${className}`}
    >
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {icon && (
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            {icon}
          </span>
        )}
        <p className="font-medium leading-tight">{title}</p>
      </div>
    </button>
  );
};
