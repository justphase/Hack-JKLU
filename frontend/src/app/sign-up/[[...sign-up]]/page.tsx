import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#030712",
        position: "relative",
      }}
    >
      {/* Background glow effects — green themed */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          textDecoration: "none",
          marginBottom: "2rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Shield size={24} color="#4ade80" strokeWidth={2.5} />
        <span
          className="gradient-text"
          style={{ fontSize: "1.5rem", fontWeight: 700 }}
        >
          Oracle&apos;s Decree
        </span>
      </Link>

      <SignUp
        forceRedirectUrl="/dashboard"
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: "#22c55e",
            colorBackground: "#111827",
            colorInputBackground: "#0a0f1a",
            colorInputText: "#f9fafb",
            colorText: "#f9fafb",
            colorTextSecondary: "#94a3b8",
            colorDanger: "#ef4444",
            borderRadius: "0.75rem",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          },
          elements: {
            rootBox: {
              width: "100%",
              maxWidth: "420px",
              position: "relative" as const,
              zIndex: 1,
            },
            card: {
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "1rem",
              boxShadow:
                "0 0 40px rgba(34,197,94,0.08), 0 20px 60px rgba(0,0,0,0.4)",
            },
            headerTitle: {
              color: "#f9fafb",
              fontSize: "1.35rem",
              fontWeight: "700",
            },
            headerSubtitle: {
              color: "#94a3b8",
            },
            socialButtonsBlockButton: {
              background: "#0a0f1a",
              border: "1px solid #1f2937",
              color: "#f9fafb",
              borderRadius: "0.75rem",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "#1f2937",
                borderColor: "#22c55e",
              },
            },
            formFieldLabel: {
              color: "#94a3b8",
            },
            formFieldInput: {
              background: "#0a0f1a",
              border: "1px solid #1f2937",
              color: "#f9fafb",
              borderRadius: "0.75rem",
              "&:focus": {
                borderColor: "#22c55e",
                boxShadow: "0 0 0 2px rgba(34,197,94,0.2)",
              },
            },
            formButtonPrimary: {
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              borderRadius: "0.75rem",
              fontWeight: "600",
              color: "#ffffff",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 8px 25px rgba(34,197,94,0.3)",
              },
            },
            footerAction: {
              color: "#94a3b8",
            },
            footerActionLink: {
              color: "#4ade80",
              fontWeight: "600",
              "&:hover": {
                color: "#22c55e",
              },
            },
            dividerLine: {
              background: "#1f2937",
            },
            dividerText: {
              color: "#64748b",
            },
            footer: {
              background: "#111827",
              borderTop: "1px solid #1f2937",
            },
            footerPages: {
              background: "#111827",
            },
            internal: {
              background: "#111827",
            },
            identityPreview: {
              background: "#0a0f1a",
              border: "1px solid #1f2937",
            },
            identityPreviewText: {
              color: "#f9fafb",
            },
            identityPreviewEditButton: {
              color: "#4ade80",
            },
            formResendCodeLink: {
              color: "#4ade80",
            },
            otpCodeFieldInput: {
              background: "#0a0f1a",
              border: "1px solid #1f2937",
              color: "#f9fafb",
            },
            alternativeMethodsBlockButton: {
              background: "#0a0f1a",
              border: "1px solid #1f2937",
              color: "#f9fafb",
              "&:hover": {
                background: "#1f2937",
              },
            },
            backLink: {
              color: "#4ade80",
            },
            badge: {
              display: "none",
            },
            logoBox: {
              display: "none",
            },
            logoImage: {
              display: "none",
            },
          },
        }}
      />

      {/* Back link */}
      <Link
        href="/"
        style={{
          color: "#64748b",
          textDecoration: "none",
          fontSize: "0.875rem",
          marginTop: "1.5rem",
          position: "relative",
          zIndex: 1,
          transition: "color 0.2s",
        }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
