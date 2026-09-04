-- ============================================================================
-- Migration 002: structured intake form fields
-- Adds direct BANT signal columns (role/authority, budget bracket, timeline
-- bracket, industry) so form-sourced leads get accurate scoring without
-- relying on regex-guessing free text, unlike the chat-sourced flow.
--
-- NOTE: these columns are already included in ../schema.sql for FRESH
-- installs. Only run this migration against an EXISTING database that was
-- created before this migration existed (i.e. the original leadqual D1
-- database, created before 2026-09-03).
--
-- Run with: npx wrangler d1 execute leadqual --file=./sql/migrations/002_form_fields.sql
-- ============================================================================

ALTER TABLE leads ADD COLUMN role TEXT;              -- Owner/Founder, C-level/Director, Manager, Employee, Other
ALTER TABLE leads ADD COLUMN industry TEXT;
ALTER TABLE leads ADD COLUMN budget_bracket TEXT;     -- <1k, 1k-5k, 5k-25k, 25k+, not_sure
ALTER TABLE leads ADD COLUMN timeline_bracket TEXT;   -- immediate, this_month, this_quarter, exploring
ALTER TABLE leads ADD COLUMN heard_about TEXT;
ALTER TABLE leads ADD COLUMN need_description TEXT;  -- free-text "what are you looking to solve" from the form
