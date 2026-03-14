# 🔮 The Oracle's Decree — Security Vulnerability Scanner

An automated security intelligence platform that unifies four scan engines (SAST, SCA, API Security, and Secrets) into a prioritized risk score (0–100).

## Project Structure

```
hackJklu/
├── frontend/          # Next.js 14 (App Router, Tailwind, Clerk Auth)
│   ├── src/app/       # Pages: /, /dashboard, /sign-in, /sign-up
│   ├── src/lib/       # API utility
│   └── src/middleware.ts
├── backend/           # Fastify (TypeScript, BullMQ, Supabase)
│   ├── src/routes/    # health, scan, reports
│   ├── src/services/  # inputRouter
│   ├── src/queue/     # BullMQ scan queue + worker
│   └── src/db/        # Supabase client + schema
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- Redis (local or cloud like Upstash)
- Supabase project
- Clerk account

### Setup

1. **Frontend**
```bash
cd frontend
cp .env.local.example .env.local  # Add Clerk keys
npm install
npm run dev
```

2. **Backend**
```bash
cd backend
cp .env.example .env  # Add Supabase + Redis credentials
npm install
npm run dev
```

3. **Database**: Run `backend/src/db/schema.sql` in your Supabase SQL editor.

## Tech Stack
- **Frontend:** Next.js 14, Tailwind CSS, Clerk, Recharts
- **Backend:** Fastify, TypeScript, BullMQ, Redis
- **Database:** Supabase (PostgreSQL)
