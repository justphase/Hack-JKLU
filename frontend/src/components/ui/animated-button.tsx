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
    sm: "px-4 py-2.5 rounded-xl text-sm",
    md: "px-5 py-3 rounded-xl text-sm",
    lg: "px-7 py-3.5 rounded-xl text-base",
  };

  return (
    <button
      {...props}
      className={`group relative overflow-hidden border cursor-pointer transition-all duration-500 ease-out 
                  shadow-lg hover:shadow-green-500/25 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]
                  ${sizes[size]} 
                  border-green-500/40 bg-gradient-to-br from-green-600/90 via-green-600 to-green-700
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-lg
                  ${className}`}
    >
      {/* Moving gradient sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-300/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      {/* Overlay glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-400/15 via-emerald-300/10 to-green-400/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2.5">
        {icon && (
          <span className="transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        )}
        <div className={subtitle ? "text-left" : ""}>
          <p className="text-white font-semibold leading-tight">{title}</p>
          {subtitle && (
            <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );
};

/* Secondary variant — outline style with same hover effect */
export const AnimatedButtonOutline: React.FC<AnimatedButtonProps> = ({
  icon,
  title,
  subtitle,
  size = "md",
  className = "",
  ...props
}) => {
  const sizes = {
    sm: "px-4 py-2.5 rounded-xl text-sm",
    md: "px-5 py-3 rounded-xl text-sm",
    lg: "px-7 py-3.5 rounded-xl text-base",
  };

  return (
    <button
      {...props}
      className={`group relative overflow-hidden border cursor-pointer transition-all duration-500 ease-out 
                  hover:shadow-green-500/15 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]
                  ${sizes[size]} 
                  border-gray-700 bg-transparent text-gray-400 hover:text-white hover:border-green-500/40
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${className}`}
    >
      {/* Moving gradient sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2.5">
        {icon && (
          <span className="transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        )}
        <p className="font-medium leading-tight">{title}</p>
      </div>
    </button>
  );
};
