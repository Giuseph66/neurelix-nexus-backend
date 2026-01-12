/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Minimal compatibility layer for non-Supabase Postgres.
  // Several migrations and backend routes expect `auth.users` to exist.
  pgm.createSchema('auth', { ifNotExists: true });

  // Create a minimal `auth.users` table only if it doesn't exist.
  // This is safe on Supabase too, because the table already exists there.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      encrypted_password text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Optional helper used by some Supabase policies/functions.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
};

exports.down = (pgm) => {
  // Don't drop auth.users by default: it may contain real data in environments that use it.
  // We only remove the helper function.
  pgm.sql(`DROP FUNCTION IF EXISTS auth.uid();`);
};


