const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export const api = {
  // Health
  health: () => request<{ status: string }>("/health"),

  // Scans
  triggerGitHubScan: (repositoryUrl: string) =>
    request<{ scanId: string; message: string }>("/scan/github", {
      method: "POST",
      body: JSON.stringify({ repositoryUrl }),
    }),

  getScanStatus: (scanId: string) =>
    request<{ scanId: string; status: string }>(`/scan/${scanId}`),

  // Reports
  getReport: (scanId: string) =>
    request<{ scanId: string; vulnerabilities: unknown[]; riskScore: number | null }>(
      `/reports/${scanId}`
    ),

  getReports: () =>
    request<{ reports: unknown[] }>("/reports"),

  // File upload scan (uses FormData, not JSON)
  uploadScan: async (files: File[]): Promise<ApiResponse<{ scanId: string; engines: unknown[] }>> => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(`${API_BASE_URL}/scan/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Network error" };
    }
  },
};

export default api;
