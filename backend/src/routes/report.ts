/**
 * PDF Report Generation – POST /report/pdf
 *
 * Accepts scan result JSON and returns a professional PDF security audit report.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import PDFDocument from "pdfkit";

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

interface ReportBody {
  scanId: string;
  riskScore: number;
  totalVulnerabilities: number;
  vulnerabilities: Vulnerability[];
  repository?: string;
  engineSummaries?: { engine: string; vulnerabilities: number; filesScanned: number; durationMs: number }[];
  completedAt?: string;
}

const COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
  info: "#6b7280",
};

export async function reportRoutes(server: FastifyInstance) {
  server.post("/report/pdf", async (request: FastifyRequest<{ Body: ReportBody }>, reply: FastifyReply) => {
    const data = request.body;

    if (!data || !data.scanId) {
      return reply.status(400).send({ error: "Scan result data is required" });
    }

    const vulns = data.vulnerabilities ?? [];
    const score = data.riskScore ?? 0;
    const severities = ["critical", "high", "medium", "low", "info"];
    const counts: Record<string, number> = {};
    severities.forEach((s) => { counts[s] = vulns.filter((v) => v.severity === s).length; });

    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const finished = new Promise<void>((resolve) => doc.on("end", resolve));

    // ─── HEADER ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 100).fill("#0f0d1a");
    doc.fontSize(28).fillColor("#a855f7").text("Oracle's Decree", 50, 30, { width: 495 });
    doc.fontSize(10).fillColor("#9ca3af").text("Security Vulnerability Report", 50, 62);
    doc.fontSize(9).fillColor("#6b7280").text(
      `Generated: ${new Date().toLocaleString()} | Scan ID: ${data.scanId.slice(0, 12)}...`,
      50, 78
    );

    doc.moveDown(2);
    let y = 120;

    // ─── RISK SCORE ─────────────────────────────────────────────────────────
    const scoreColor = score >= 70 ? COLORS.critical : score >= 40 ? COLORS.high : score >= 20 ? COLORS.medium : COLORS.low;
    const scoreLabel = score >= 70 ? "CRITICAL RISK" : score >= 40 ? "HIGH RISK" : score >= 20 ? "MEDIUM RISK" : "LOW RISK";

    doc.rect(50, y, 495, 80).lineWidth(1).strokeColor(scoreColor).fillAndStroke("#1a1625", scoreColor);
    doc.fontSize(36).fillColor(scoreColor).text(`${score}`, 70, y + 12, { width: 80 });
    doc.fontSize(10).fillColor("#9ca3af").text("/100", 150, y + 30);
    doc.fontSize(14).fillColor(scoreColor).text(scoreLabel, 200, y + 20, { width: 200 });
    doc.fontSize(10).fillColor("#d1d5db").text(`${data.totalVulnerabilities || vulns.length} total vulnerabilities found`, 200, y + 42);
    if (data.repository) {
      doc.fontSize(9).fillColor("#9ca3af").text(`Repository: ${data.repository}`, 200, y + 58);
    }
    y += 100;

    // ─── SEVERITY BREAKDOWN ─────────────────────────────────────────────────
    doc.fontSize(14).fillColor("#e5e7eb").text("Severity Breakdown", 50, y);
    y += 22;

    const barWidth = 495;
    const total = vulns.length || 1;
    let barX = 50;

    // Stacked bar
    severities.forEach((sev) => {
      if (counts[sev] > 0) {
        const w = (counts[sev] / total) * barWidth;
        doc.rect(barX, y, w, 16).fill(COLORS[sev]);
        barX += w;
      }
    });
    if (vulns.length === 0) {
      doc.rect(50, y, barWidth, 16).fill(COLORS.low);
    }
    y += 26;

    // Legend
    severities.forEach((sev, i) => {
      const lx = 50 + i * 100;
      doc.rect(lx, y, 10, 10).fill(COLORS[sev]);
      doc.fontSize(9).fillColor("#d1d5db").text(`${sev.charAt(0).toUpperCase() + sev.slice(1)}: ${counts[sev]}`, lx + 14, y);
    });
    y += 28;

    // ─── ENGINE SUMMARIES ───────────────────────────────────────────────────
    if (data.engineSummaries?.length) {
      doc.fontSize(14).fillColor("#e5e7eb").text("Engine Results", 50, y);
      y += 20;

      // Table header
      doc.rect(50, y, 495, 18).fill("#1e1b2e");
      doc.fontSize(8).fillColor("#a855f7");
      doc.text("ENGINE", 55, y + 4, { width: 120 });
      doc.text("VULNS FOUND", 180, y + 4, { width: 80 });
      doc.text("FILES SCANNED", 270, y + 4, { width: 90 });
      doc.text("DURATION", 380, y + 4, { width: 80 });
      y += 20;

      data.engineSummaries.forEach((eng, i) => {
        if (i % 2 === 0) doc.rect(50, y, 495, 16).fill("#151220");
        doc.fontSize(8).fillColor("#e5e7eb");
        doc.text(eng.engine, 55, y + 3, { width: 120 });
        doc.fillColor(eng.vulnerabilities > 0 ? COLORS.high : COLORS.low);
        doc.text(`${eng.vulnerabilities}`, 180, y + 3, { width: 80 });
        doc.fillColor("#e5e7eb");
        doc.text(`${eng.filesScanned}`, 270, y + 3, { width: 90 });
        doc.text(`${eng.durationMs}ms`, 380, y + 3, { width: 80 });
        y += 18;
      });
      y += 10;
    }

    // ─── VULNERABILITY DETAILS ──────────────────────────────────────────────
    if (vulns.length > 0) {
      doc.addPage();
      y = 50;

      doc.fontSize(16).fillColor("#e5e7eb").text("Vulnerability Details", 50, y);
      y += 28;

      vulns.forEach((v, i) => {
        const sevColor = COLORS[v.severity] || COLORS.info;

        // Check if we need a new page (leave room for at least the header + 100px)
        if (y > 680) {
          doc.addPage();
          y = 50;
        }

        // Vuln header
        doc.rect(50, y, 495, 22).fill("#1a1625");
        doc.rect(50, y, 4, 22).fill(sevColor);
        doc.fontSize(8).fillColor(sevColor).text(v.severity.toUpperCase(), 60, y + 6, { width: 60 });
        doc.fontSize(9).fillColor("#e5e7eb").text(`#${i + 1} ${v.title}`, 120, y + 5, { width: 350 });
        if (v.cweId) {
          doc.fontSize(7).fillColor("#9ca3af").text(v.cweId, 470, y + 6, { width: 70, align: "right" });
        }
        y += 26;

        // File + engine
        doc.fontSize(8).fillColor("#9ca3af").text(`📁 ${v.filePath}:${v.lineNumber ?? "?"}  |  🔍 ${v.engine}`, 55, y);
        y += 14;

        // Description
        doc.fontSize(8).fillColor("#d1d5db").text(v.description, 55, y, { width: 480 });
        y = doc.y + 8;

        // Code snippet
        if (v.codeSnippet) {
          doc.rect(55, y, 480, 30).fill("#0f0d1a");
          doc.fontSize(7).fillColor("#a3e635").text(v.codeSnippet.slice(0, 200), 60, y + 4, { width: 470 });
          y += 34;
        }

        // Fix suggestion
        doc.rect(55, y, 480, 1).fill("#22c55e22");
        doc.fontSize(8).fillColor("#22c55e").text("✅ Fix: ", 55, y + 4, { continued: true });
        doc.fillColor("#d1d5db").text(v.fixSuggestion.slice(0, 300), { width: 440 });
        y = doc.y + 12;
      });
    }

    // ─── FOOTER ─────────────────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor("#6b7280").text(
        `Oracle's Decree Security Report - Page ${i + 1} of ${pageCount}`,
        50, 780,
        { width: 495, align: "center" }
      );
    }

    doc.end();
    await finished;

    const pdfBuffer = Buffer.concat(chunks);

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="oracle-decree-report-${data.scanId.slice(0, 8)}.pdf"`);
    reply.header("Content-Length", pdfBuffer.length);
    return reply.send(pdfBuffer);
  });
}
