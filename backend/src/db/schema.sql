-- ============================================
-- The Oracle's Decree — Database Schema
-- ============================================

-- Users table (synced with Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast Clerk ID lookups
CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'github')),
  repository_url TEXT,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  total_vulnerabilities INTEGER DEFAULT 0,
  scan_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for user scan lookups
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_status ON scans(status);

-- Vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  engine TEXT NOT NULL CHECK (engine IN ('sast', 'sca', 'secrets', 'api-security')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  line_number INTEGER,
  code_snippet TEXT,
  fix_suggestion TEXT,
  cvss_score DECIMAL(3,1),
  cwe_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scan vulnerability lookups
CREATE INDEX idx_vulnerabilities_scan_id ON vulnerabilities(scan_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_engine ON vulnerabilities(engine);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  pdf_url TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_scan_id ON reports(scan_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can view own scans" ON scans
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims')::json->>'sub'
  ));

CREATE POLICY "Users can insert own scans" ON scans
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims')::json->>'sub'
  ));

CREATE POLICY "Users can view own vulnerabilities" ON vulnerabilities
  FOR SELECT USING (scan_id IN (
    SELECT id FROM scans WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims')::json->>'sub'
    )
  ));

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (scan_id IN (
    SELECT id FROM scans WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims')::json->>'sub'
    )
  ));
