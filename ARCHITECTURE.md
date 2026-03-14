# Oracle's Decree — Architecture & Technical Deep Dive

This document provides a comprehensive A-Z breakdown of the **Oracle's Decree** architecture, the rationale behind our technology choices, and how the various systems interact to provide a seamless, secure, and resilient smart contract and code security scanning platform.

---

## 🏗️ 1. Core Architecture Pattern: Decoupled System

We chose a completely **decoupled architecture**, splitting the system into two entirely separate applications:

1. **Frontend Client** (Next.js / React)
2. **Backend API & Worker** (Fastify / Node.js)

### Why Decouple?
Security scanning is extremely CPU and memory-intensive. 
* If a monolithic architecture was used (where the web server serving HTML also runs the security scanners), parsing a large codebase's Abstract Syntax Tree (AST) would instantly spike the server's CPU to 100%. 
* This spike would cause the website to crash or time out for every other visitor trying to load the homepage.
* **By decoupling:** The Frontend remains lightning-fast and highly available to thousands of concurrent users, while the separate Backend is strictly dedicated to handling intense computational tasks in the background without affecting the user interface.

---

## 🌐 2. Deployment Strategy

Because we decoupled the architecture, we deployed the halves to infrastructure optimized for their specific needs.

### Frontend: Vercel
* **Why Vercel:** Vercel is the creator of Next.js and provides the world's best Edge Network (CDN) for React applications. Deploying here ensures the UI loads globally in milliseconds safely and securely. It excels at serving static assets and lightweight serverless API routes.

### Backend: Render.com
* **Why Render:** Serverless environments (like AWS Lambda or Vercel functions) strictly kill processes that take longer than 10-15 seconds. Security scans often take 30-60 seconds. We deployed the backend to Render because it provides **dedicated, long-running Node.js web services**. The backend can take as long as it needs to run heavy security audits without being abruptly killed.

---

## ⚙️ 3. The Four Security Engines

To provide state-of-the-art security analysis, a multi-layered approach was required. No single scanner catches everything. Oracle's Decree routes code through four distinct engines:

### 1. SAST (Static Application Security Testing)
* **What it does:** Scans the raw source code text and Abstract Syntax Trees (AST) looking for known dangerous patterns based on OWASP top 10 rules.
* **Why we use it:** It catches obvious developer mistakes instantly without executing the code. Examples include manual `eval()` usage, SQL Injection patterns, Cross-Site Scripting (XSS) vectors, and hardcoded debugging endpoints.

### 2. SCA (Software Composition Analysis)
* **What it does:** Analyzes dependency manifests (`package.json`, etc.) to identify third-party libraries incorporated into the project.
* **Why we use it:** Over 80% of modern web apps rely on open-source libraries, many of which contain known vulnerabilities. The SCA engine leverages the **NPM Audit API** (or equivalent vulnerability databases) to cross-reference the user's dependencies against registered CVEs (Common Vulnerabilities and Exposures), catching risks in code the primary developers didn't even write.

### 3. SEC (Secrets Scanner)
* **What it does:** Uses advanced regular expressions combined with **Shannon Entropy analysis** to scan all files for accidently committed sensitive data.
* **Why we use it:** Exposed API keys, database passwords, and AWS credentials are the leading causes of massive data breaches. By analyzing entropy (the randomness of characters in a string), the SEC engine can detect highly randomized strings like `sk_live_xyz123...` even if we don't have a specific Regex pattern for that exact service yet.

### 4. AI Engine / Deep Scan (Google Gemini API)
* **What it does:** Acts as a virtual Senior Security Auditor. We feed complex code chunks into Google's Gemini Pro LLM API.
* **Why we use it:** Traditional SAST tools rely on rigid rules and produce many false positives. Gemini understands the *logical context* of the code. It can deduce high-level flaws that Regex tools completely miss (like Broken Business Logic, complex Race Conditions, or Authorization Bypasses) and, crucially, generates human-readable fix suggestions with exact CLI commands.

---

## 🛡️ 4. Third-Party APIs & Integrations

### Clerk (Authentication & User Management)
* **Why:** Building secure authentication from scratch is a massive security risk in itself. Clerk handles JWTs, session tokens, passwords, and OAuth out of the box. It protects the application from common attacks like brute-forcing and session hijacking, allowing the team to focus on the core scanner product.

### GitHub API & GitHub Apps
* **Why:** Requiring users to ZIP their code and upload it manually creates extreme friction.
* **Integration:** We built a custom GitHub App. When a user authenticates, the App securely requests an OAuth Access Token. Our backend uses this token to call the **GitHub REST API** to clone their code directly into our secure processing environment automatically.

---

## 🚦 5. Background Processing & Queue System

### The Problem: Server Timeouts
When a user clicks "Scan", the server must: Download the repo -> Run SAST -> Run SCA -> Run SEC -> Send chunks to Gemini -> Compile results. This takes ~45 seconds. Browsers typically drop HTTP requests if a server doesn't respond within 30 seconds.

### The Solution: BullMQ & Upstash Redis
1. **Upstash Redis:** We provisioned a blazing-fast, in-memory Redis database.
2. **BullMQ Workflow:** 
   * When a user requests a scan, the backend immediately writes a small "Job Ticket" into Redis (e.g., `"Job #102: Scan Repo XYZ"`).
   * The backend instantly replies to the Frontend: *"Got it, starting!"* (No timeout!)
   * A separate **Background Worker** on the backend constantly watches Redis. It picks up Job #102, runs all four heavy security engines over the next few minutes.
   * While running, the Frontend polls the backend every 2 seconds asking: *"Is Job #102 done yet?"*
   * Once the worker finishes, it updates the job status to `Complete` and saves the data. The next time the Frontend asks, the backend hands over the final React-ready JSON.

---

## 🗄️ 6. Data Persistence layer

### Supabase PostgreSQL & Prisma ORM
* **Why Supabase:** We needed a robust relational database to store users, scan history, PDF reports, and telemetry. Supabase provides an instantly scalable PostgreSQL database.
* **Why Prisma:** Prisma acts as our Object-Relational Mapper (ORM). It allows the backend to interact with the database using strictly-typed TypeScript exactly matching the schema. This prevents runtime database errors, SQL injection attacks on our own system, and makes querying incredibly fast and safe.

---

## 🔄 7. The Final Request Flow (A to Z)

Here is the exact step-by-step journey of data when a user secures their project:

1. **Access:** User visits the **Vercel** deployed frontend (`oracle-decree.vercel.app`).
2. **Auth:** User logs in securely via the **Clerk** integration.
3. **Connect:** User grants access to their repositories via the secure **GitHub App OAuth flow**.
4. **Trigger:** User clicks "Start Scan". The frontend fires off an HTTP request to the **Render** Backend (`oracle-backend.onrender.com/api`).
5. **Queueing:** The Render Backend delegates the task by putting it in the **Upstash Redis Queue**.
6. **Execution:** The Render Backend's Background Worker picks up the job, utilizing the **GitHub API** to clone the source code into a temporary secure sandbox.
7. **Analysis:** The Worker runs the code through the **SAST, SCA, and SEC engines**, then sends complex logic to the **Google Gemini API** for deep analysis.
8. **Storage:** The final, aggregated JSON vulnerability report is formatted and saved to the **Supabase PostgreSQL** database using **Prisma**.
9. **Display:** The Vercel Frontend detects the job completion and beautifully renders the findings using **Recharts** and tailored React components.
