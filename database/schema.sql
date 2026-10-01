CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'New Trip',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_code TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL DEFAULT 'Trip expense',
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS travelers_trip_id_idx ON travelers(trip_id);
CREATE INDEX IF NOT EXISTS expenses_trip_id_idx ON expenses(trip_id);
CREATE UNIQUE INDEX IF NOT EXISTS trips_share_code_idx ON trips(share_code);
