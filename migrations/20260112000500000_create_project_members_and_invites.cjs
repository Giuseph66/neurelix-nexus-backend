/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 *
 * Cria tabelas que existem no schema Supabase (dump) mas que não são criadas
 * pelas migrations do backend, e são necessárias para as migrations de custom role.
 *
 * - public.project_members
 * - public.project_invites
 *
 * Idempotente: cria tabelas/constraints/índices apenas se não existirem.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // project_members
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.project_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role public.app_role NOT NULL DEFAULT 'developer',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // unique (project_id, user_id)
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_id_user_id_key') THEN
        ALTER TABLE ONLY public.project_members
          ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);
      END IF;
    END $$;
  `);

  // project_invites
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.project_invites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      email text NOT NULL,
      role public.app_role NOT NULL DEFAULT 'developer',
      invited_by uuid NOT NULL REFERENCES auth.users(id),
      token uuid NOT NULL DEFAULT gen_random_uuid(),
      accepted_at timestamptz,
      expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // unique token
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_invites_token_key') THEN
        ALTER TABLE ONLY public.project_invites
          ADD CONSTRAINT project_invites_token_key UNIQUE (token);
      END IF;
    END $$;
  `);

  // unique active invite per project/email (accepted_at is null)
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_invites_unique_active' AND tablename = 'project_invites') THEN
        CREATE UNIQUE INDEX idx_project_invites_unique_active
          ON public.project_invites (project_id, email)
          WHERE accepted_at IS NULL;
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'project_invites' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'project_members' }, { ifExists: true, cascade: true });
};


