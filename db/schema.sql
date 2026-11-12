-- Paperlane schema. Safe to run more than once.
CREATE TABLE IF NOT EXISTS users (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  color      text NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     text NOT NULL REFERENCES users(id),
  title        text NOT NULL DEFAULT 'Untitled document'
               CHECK (char_length(title) BETWEEN 1 AND 200),
  content_html text NOT NULL DEFAULT '',
  version      integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS document_shares (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id),
  role        text NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS document_shares_user_idx ON document_shares (user_id);

-- Seeded demo accounts (auth is mocked: pick a user on the sign-in screen)
INSERT INTO users (id, name, email, color) VALUES
  ('alice', 'Alice Khan',  'alice@paperlane.test', '#2563eb'),
  ('bob',   'Bob Mirza',   'bob@paperlane.test',   '#16a34a'),
  ('carol', 'Carol Diaz',  'carol@paperlane.test', '#c2410c')
ON CONFLICT (id) DO NOTHING;
