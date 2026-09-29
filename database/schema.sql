CREATE TABLE trips (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL DEFAULT 'New Trip', currency TEXT NOT NULL DEFAULT 'INR', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), share_code TEXT);
CREATE TABLE travelers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE, payer_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT, title TEXT NOT NULL DEFAULT 'Trip expense', amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX travelers_trip_id_idx ON travelers(trip_id);
CREATE INDEX expenses_trip_id_idx ON expenses(trip_id);
CREATE UNIQUE INDEX trips_share_code_idx ON trips(share_code);
