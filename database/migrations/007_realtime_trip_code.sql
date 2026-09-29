ALTER TABLE trips ADD COLUMN share_code TEXT;
CREATE UNIQUE INDEX trips_share_code_idx ON trips(share_code);
