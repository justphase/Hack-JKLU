"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Shield, Upload, FileCode, Package, Globe, FolderOpen,
  X, ArrowRight, Lock, GitBranch, Loader, AlertTriangle
} from "lucide-react";
import ScanResults from "../../components/ScanResults";
import ScanProgress from "../../components/ScanProgress";
import { AnimatedButton } from "../../components/ui/animated-button";

type ScanStatus = "idle" | "uploading" | "scanning" | "cloning" | "done" | "error";

interface Vulnerability {
  engine: string;
  severity: string;
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet?: string;
  fixSuggestion: string;
  cweId?: string;
}

interface ScanResponse {
  scanId: string;
  riskScore?: number;
  totalVulnerabilities?: number;
  vulnerabilities?: Vulnerability[];
  engineSummaries?: { engine: string; vulnerabilities: number; filesScanned: number; durationMs: number }[];
  message?: string;
  repository?: string;
  completedAt?: string;
  ipfsCid?: string;
  ipfsUrl?: string;
  txHash?: string;
  explorerUrl?: string;
  contentHash?: string;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

  const [activeTab, setActiveTab] = useState<"upload" | "github">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── GitHub App State ──
  const [githubInstallId, setGithubInstallId] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<string | null>(null);
  const [githubAvatar, setGithubAvatar] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<Array<{ fullName: string; name: string; isPrivate: boolean; url: string; description: string | null; language: string | null; defaultBranch: string }>>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // ── Handle GitHub App callback + load from localStorage ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installId = params.get("github_installation_id");
    const ghUser = params.get("github_user");
    const avatar = params.get("github_avatar");
    const ghError = params.get("github_error");

    if (installId) {
      localStorage.setItem("github_installation_id", installId);
      if (ghUser) localStorage.setItem("github_user", ghUser);
      if (avatar) localStorage.setItem("github_avatar", avatar);
      setGithubInstallId(installId);
      setGithubUser(ghUser);
      setGithubAvatar(avatar);
      window.history.replaceState({}, "", window.location.pathname);
      setActiveTab("github");
    } else if (ghError) {
      setErrorMsg(`GitHub connection failed: ${ghError}`);
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      const saved = localStorage.getItem("github_installation_id");
      if (saved) {
        setGithubInstallId(saved);
        setGithubUser(localStorage.getItem("github_user"));
        setGithubAvatar(localStorage.getItem("github_avatar"));
      }
    }
  }, []);

  // ── Load repos ──
  useEffect(() => {
    if (githubInstallId && activeTab === "github") {
      setLoadingRepos(true);
      fetch(`${API_URL}/auth/github/repos?installation_id=${githubInstallId}`)
        .then((res) => res.json())
        .then((data) => setGithubRepos(data.repos ?? []))
        .catch(() => setGithubRepos([]))
        .finally(() => setLoadingRepos(false));
    }
  }, [githubInstallId, activeTab]);

  const connectGithub = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  const disconnectGithub = async () => {
    if (githubInstallId) {
      await fetch(`${API_URL}/auth/github/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installation_id: githubInstallId }),
      }).catch(() => {});
    }
    localStorage.removeItem("github_installation_id");
    localStorage.removeItem("github_user");
    localStorage.removeItem("github_avatar");
    setGithubInstallId(null);
    setGithubUser(null);
    setGithubAvatar(null);
    setGithubRepos([]);
    setGithubUrl("");
  };

  // ── File handlers ──
  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = arr.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
    setScanResult(null);
    setScanStatus("idle");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const removeFile = (index: number) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith(".json")) return <Package size={15} className="text-yellow-400" />;
    if (name.endsWith(".yaml") || name.endsWith(".yml")) return <Globe size={15} className="text-blue-400" />;
    if (name.endsWith(".env")) return <Lock size={15} className="text-red-400" />;
    return <FileCode size={15} className="text-gray-400" />;
  };

  // ── Upload Scan ──
  const handleUploadScan = async () => {
    if (!selectedFiles.length) return;
    setScanStatus("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      setScanStatus("scanning");

      const res = await fetch(`${API_URL}/scan/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: ScanResponse = await res.json();
      setScanResult(data);
      setScanStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Scan failed");
      setScanStatus("error");
    }
  };

  // ── GitHub Scan ──
  const handleGithubScan = async () => {
    if (!githubUrl.trim()) return;
    setScanStatus("cloning");
    setErrorMsg("");
    setScanResult(null);

    try {
      let githubToken: string | undefined;
      if (githubInstallId) {
        const tokenRes = await fetch(`${API_URL}/auth/github/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installation_id: githubInstallId }),
        });
        const tokenData = (await tokenRes.json()) as { token?: string };
        githubToken = tokenData.token;
      }

      const res = await fetch(`${API_URL}/scan/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl: githubUrl, githubToken }),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: ScanResponse = await res.json();
      setScanResult(data);
      setScanStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "GitHub scan failed");
      setScanStatus("error");
    }
  };

  const resetScan = () => {
    setScanStatus("idle");
    setScanResult(null);
    setErrorMsg("");
    setSelectedFiles([]);
    setGithubUrl("");
  };

  const isScanning = scanStatus === "scanning" || scanStatus === "uploading" || scanStatus === "cloning";

  // ── Loading ──
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield size={36} className="text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Show results ──
  if (scanStatus === "done" && scanResult) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800/60">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Shield size={22} className="text-green-400" strokeWidth={2} />
            <span className="text-lg font-semibold tracking-tight">Oracle&apos;s Decree</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm">Scan results</span>
            <AnimatedButton onClick={resetScan} title="New scan" size="sm" />
            <UserButton />
          </div>
        </nav>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <ScanResults result={scanResult} onReset={resetScan} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800/60">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Shield size={22} className="text-green-400" strokeWidth={2} />
          <span className="text-lg font-semibold tracking-tight">Oracle&apos;s Decree</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">
            {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
          </span>
          <UserButton />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {isScanning ? (
          <ScanProgress />
        ) : (
          <>
            {/* Header */}
            <div className="mb-10">
          <h1 className="text-4xl font-black mb-3 tracking-tight">Scan your project</h1>
          <p className="text-gray-400 text-lg">
            Upload your files or connect GitHub. Full security report in under 60 seconds.
          </p>
        </div>

        {/* ── GitHub Tab ── */}
        {activeTab === "github" || githubInstallId ? (
          <>
            {/* Repo URL / GitHub App section */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {githubInstallId ? `Connected as ${githubUser || "GitHub"}` : "Scan from a repository URL"}
              </p>

              {githubInstallId ? (
                <>
                  {/* Connected GitHub header */}
                  <div className="flex items-center justify-between mb-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      {githubAvatar && <img src={githubAvatar} alt="" className="w-8 h-8 rounded-full" />}
                      <div>
                        <span className="text-sm font-medium">{githubUser || "GitHub User"}</span>
                        <span className="ml-2 bg-green-600/15 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">✓ Installed</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`https://github.com/settings/installations/${githubInstallId}`} target="_blank" rel="noreferrer" className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                        Modify access
                      </a>
                      <button onClick={disconnectGithub} className="border border-red-500/30 text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Repos list */}
                  {loadingRepos ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                      <Loader size={14} className="animate-spin" /> Loading repos...
                    </div>
                  ) : githubRepos.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto border border-gray-800 rounded-xl mb-4">
                      {githubRepos.map((repo) => (
                        <button
                          key={repo.fullName}
                          onClick={() => setGithubUrl(repo.url)}
                          className={`flex items-center justify-between w-full px-4 py-3 border-b border-gray-800/60 last:border-0 text-left transition-colors ${
                            githubUrl === repo.url ? "bg-green-600/10" : "hover:bg-gray-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{repo.name}</span>
                            {repo.isPrivate && (
                              <span className="bg-yellow-500/15 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">Private</span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs">{repo.language || ""}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">
                      No repos found.{" "}
                      <a href={`https://github.com/settings/installations/${githubInstallId}`} target="_blank" rel="noreferrer" className="text-green-400 hover:underline">
                        Add repos on GitHub
                      </a>
                    </p>
                  )}
                </>
              ) : null}

              {/* URL input */}
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-gray-500 focus-within:border-green-500 rounded-xl px-4 py-3.5 transition-colors">
                  <GitBranch size={18} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none"
                    onKeyDown={(e) => e.key === "Enter" && handleGithubScan()}
                  />
                  {githubUrl && (
                    <button onClick={() => setGithubUrl("")} className="text-gray-600 hover:text-gray-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <AnimatedButton
                  onClick={handleGithubScan}
                  disabled={!githubUrl || isScanning}
                  icon={isScanning ? <Loader size={14} className="animate-spin" /> : <ArrowRight size={16} />}
                  title={isScanning ? "Scanning..." : "Scan repo"}
                  size="md"
                  className="shrink-0"
                />
              </div>
              {!githubInstallId && (
                <p className="text-xs text-gray-600 mt-3 ml-1">
                  Public repos only ·{" "}
                  <button onClick={connectGithub} className="text-green-400 hover:underline">
                    Install GitHub App
                  </button>{" "}
                  for private repos
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">or upload files manually</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          </>
        ) : (
          /* Not connected — show connect button */
          <div className="mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center mb-6">
              <GitBranch size={32} className="text-green-400 mx-auto mb-3" />
              <h3 className="font-bold mb-2">Connect GitHub</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
                Install the Oracle&apos;s Decree GitHub App. Choose exactly which repos to grant access.
              </p>
              <AnimatedButton onClick={connectGithub} icon={<GitBranch size={16} />} title="Install GitHub App" size="md" />
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">or upload files manually</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          </div>
        )}

        {/* ── Drop zone ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all mb-6 ${
            dragOver
              ? "border-green-400 bg-green-400/5"
              : "border-gray-700 hover:border-gray-500 bg-gray-900/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept=".js,.jsx,.ts,.tsx,.py,.json,.yaml,.yml,.env,.toml,.cfg,.conf,.ini"
          />
          <Upload size={44} className={`mx-auto mb-4 ${dragOver ? "text-green-400" : "text-gray-600"}`} />
          {dragOver ? (
            <p className="text-green-400 text-xl font-bold">Drop files here</p>
          ) : (
            <>
              <p className="text-white text-lg font-bold mb-1">Drag and drop your files here</p>
              <p className="text-gray-500 text-sm mb-5">or click to browse your computer</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[".js", ".jsx", ".ts", ".tsx", ".py", "package.json", ".env", ".yaml"].map((ext) => (
                  <span key={ext} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-md">
                    {ext}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* File list */}
        {selectedFiles.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} ready to scan
            </p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0">
                  <span className="flex items-center shrink-0">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start scan button */}
        <AnimatedButton
          onClick={handleUploadScan}
          disabled={selectedFiles.length === 0 || isScanning}
          icon={isScanning ? <Loader size={18} className="animate-spin" /> : selectedFiles.length > 0 ? <ArrowRight size={18} /> : undefined}
          title={isScanning ? "Scanning..." : selectedFiles.length > 0 ? "Start security scan" : "Upload files to begin"}
          size="lg"
          className="w-full"
        />

        {selectedFiles.length > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-gray-600 text-xs mt-3">
            <Lock size={11} />
            Files are scanned and deleted immediately — never stored
          </p>
        )}

        {/* Error */}
        {scanStatus === "error" && (
          <div className="mt-6 bg-red-500/10 border border-red-500/25 rounded-xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{errorMsg || "Scan failed"}</span>
            </div>
            <button onClick={resetScan} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
