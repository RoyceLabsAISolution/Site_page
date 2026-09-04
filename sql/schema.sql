-- ============================================================================
-- Lead Qualification System - Cloudflare D1 (SQLite) schema
-- Direct translation of ../sql/01_schema.sql (Postgres) for the Workers port.
-- Run with: npx wrangler d1 execute leadqual --file=./sql/schema.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id   TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tenant_config (
    tenant_id           TEXT PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    questions           TEXT NOT NULL DEFAULT '[]',
    scoring_icp         TEXT,
    service_catalog     TEXT,
    slack_webhook_url   TEXT,
    booking_url         TEXT,
    form_link_template  TEXT,
    rate_limit_per_min  INTEGER NOT NULL DEFAULT 20,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Leads: every field from the Postgres version preserved verbatim.
CREATE TABLE IF NOT EXISTS leads (
    lead_id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id                  TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(tenant_id),
    name                       TEXT,
    phone                      TEXT,
    email                      TEXT,
    company_name               TEXT,
    company_website            TEXT,
    linkedin_url                TEXT,
    instagram_handle           TEXT,
    youtube_channel            TEXT,
    source                     TEXT,
    status                     TEXT DEFAULT 'New',
    current_step               INTEGER DEFAULT 0,
    conversation_answers       TEXT,
    form_data                  TEXT,
    ai_score                   INTEGER,
    ai_tier                    TEXT,
    ai_summary                 TEXT,
    ai_key_points              TEXT,
    business_research_report   TEXT,
    recommended_services       TEXT,
    research_talking_points    TEXT,
    assigned_rep               TEXT,
    meeting_time               TEXT,
    ig_user_id                 TEXT,
    session_id                 TEXT,
    bant_budget                INTEGER,
    bant_authority              INTEGER,
    bant_need                  INTEGER,
    bant_timeline               INTEGER,
    enrichment_data             TEXT,
    consent_given               INTEGER DEFAULT 0,
    -- Structured intake form fields (migration 002) - direct BANT signals,
    -- avoids regex-guessing free text like the chat-sourced flow must.
    role                        TEXT,  -- Owner/Founder, C-level/Director, Manager, Employee, Other
    industry                    TEXT,
    budget_bracket              TEXT,  -- <1k, 1k-5k, 5k-25k, 25k+, not_sure
    timeline_bracket            TEXT,  -- immediate, this_month, this_quarter, exploring
    heard_about                 TEXT,
    need_description            TEXT,
    created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                 TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant  ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_leads_ig_user ON leads(tenant_id, ig_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email   ON leads(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_phone   ON leads(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(tenant_id, status);

-- Telemetry / funnel events
CREATE TABLE IF NOT EXISTS events (
    event_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id   TEXT NOT NULL DEFAULT 'default',
    lead_id     INTEGER,
    event_type  TEXT NOT NULL,
    detail      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_tenant_type ON events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_lead        ON events(lead_id);

-- Rate limiting counters - per session sliding window (1 minute)
CREATE TABLE IF NOT EXISTS rate_limits (
    tenant_id    TEXT NOT NULL,
    session_key  TEXT NOT NULL,
    window_start TEXT NOT NULL DEFAULT (datetime('now')),
    count        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, session_key)
);

-- Processed webhook message IDs, for WhatsApp/Instagram redelivery dedup.
-- Replaces n8n's $getWorkflowStaticData('global') in-memory cache - Workers
-- has no persistent in-memory state across requests, so this must be durable.
CREATE TABLE IF NOT EXISTS processed_messages (
    channel      TEXT NOT NULL,
    message_id   TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (channel, message_id)
);

-- Hybrid FAQ <-> structured-qualification chat sessions (roycelabs.pages.dev
-- widget). A session starts in 'faq' mode (free-form Q&A about the
-- business); once buying intent or contact info is detected, it flips to
-- 'qualifying' mode and all further turns are handled by the same
-- Qualifying-Core slot state machine used by the website chat webhook.
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id  TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL DEFAULT 'default',
    mode        TEXT NOT NULL DEFAULT 'faq',
    lead_id     INTEGER,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO tenants (tenant_id, name) VALUES ('default', 'Default Agency');
INSERT OR IGNORE INTO tenant_config (tenant_id) VALUES ('default');
