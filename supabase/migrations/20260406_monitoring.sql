-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  properties  JSONB,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT,
  platform    TEXT,
  app_version TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id          BIGSERIAL PRIMARY KEY,
  message     TEXT NOT NULL,
  stack       TEXT,
  context     JSONB,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform    TEXT,
  app_version TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only service role can read, anonymous can insert
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anon_insert_errors" ON public.error_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
