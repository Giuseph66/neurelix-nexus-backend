/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration base que cria as tabelas essenciais do sistema
 * antes das migrations que dependem delas (assistant_messages, etc)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar enum app_role se não existir
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'tech_lead', 'developer', 'viewer');
      END IF;
    END $$;
  `);

  // Criar tabela projects (essencial)
  pgm.createTable(
    { schema: 'public', name: 'projects' },
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      name: {
        type: 'text',
        notNull: true,
      },
      slug: {
        type: 'text',
        notNull: true,
        unique: true,
      },
      description: {
        type: 'text',
      },
      created_by: {
        type: 'uuid',
        references: 'auth.users(id)',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
    },
    { ifNotExists: true }
  );

  // Criar índices apenas se não existirem (para evitar erro se tabela já foi criada)
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'projects_slug_unique_index' AND tablename = 'projects') THEN
        CREATE UNIQUE INDEX projects_slug_unique_index ON public.projects (slug);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'projects_created_by_index' AND tablename = 'projects') THEN
        CREATE INDEX projects_created_by_index ON public.projects (created_by);
      END IF;
    END $$;
  `);

  // Criar tabela whiteboards (essencial para assistant_messages)
  pgm.createTable(
    { schema: 'public', name: 'whiteboards' },
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      project_id: {
        type: 'uuid',
        notNull: true,
        references: 'public.projects(id)',
        onDelete: 'CASCADE',
      },
      name: {
        type: 'text',
        notNull: true,
      },
      created_by: {
        type: 'uuid',
        references: 'auth.users(id)',
        onDelete: 'SET NULL',
      },
      parent_branch_id: {
        type: 'uuid',
        references: 'public.whiteboards(id)',
        onDelete: 'SET NULL',
      },
      branch_name: {
        type: 'text',
      },
      branch_metadata: {
        type: 'jsonb',
        default: '{}',
      },
      viewport: {
        type: 'jsonb',
        default: '{"x": 0, "y": 0, "zoom": 1}',
      },
      settings: {
        type: 'jsonb',
        default: '{}',
      },
      canvas_snapshot: {
        type: 'jsonb',
      },
      snapshot_version: {
        type: 'bigint',
        notNull: true,
        default: 0,
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('now()'),
      },
    },
    { ifNotExists: true }
  );

  // Criar índices apenas se não existirem
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'whiteboards_project_id_index' AND tablename = 'whiteboards') THEN
        CREATE INDEX whiteboards_project_id_index ON public.whiteboards (project_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'whiteboards_parent_branch_id_index' AND tablename = 'whiteboards') THEN
        CREATE INDEX whiteboards_parent_branch_id_index ON public.whiteboards (parent_branch_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'whiteboards_created_by_index' AND tablename = 'whiteboards') THEN
        CREATE INDEX whiteboards_created_by_index ON public.whiteboards (created_by);
      END IF;
    END $$;
  `);

  // Criar enums necessários para provider_connections e repos
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'git_provider') THEN
        CREATE TYPE public.git_provider AS ENUM ('github', 'bitbucket');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status') THEN
        CREATE TYPE public.connection_status AS ENUM ('active', 'error', 'revoked');
      END IF;
    END $$;
  `);

  // Criar tabela provider_connections (necessária para repos)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.provider_connections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      provider public.git_provider NOT NULL DEFAULT 'github',
      owner_type text NOT NULL,
      owner_name text NOT NULL,
      installation_id text,
      workspace_id text,
      status public.connection_status NOT NULL DEFAULT 'active',
      secrets_ref text,
      last_sync_at timestamptz,
      error_message text,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      github_user_id text,
      username text,
      access_token_encrypted text,
      scopes text[] DEFAULT '{}'
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_connections_owner_type_check') THEN
        ALTER TABLE public.provider_connections 
        ADD CONSTRAINT provider_connections_owner_type_check 
        CHECK (owner_type IN ('user', 'org'));
      END IF;
    END $$;
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_provider_connections_project_id' AND tablename = 'provider_connections') THEN
        CREATE INDEX idx_provider_connections_project_id ON public.provider_connections (project_id);
      END IF;
    END $$;
  `);

  // Criar tabela repos (necessária para local_pr_*)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.repos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id uuid REFERENCES public.provider_connections(id) ON DELETE CASCADE,
      provider_repo_id text NOT NULL,
      full_name text NOT NULL,
      default_branch text NOT NULL,
      visibility text NOT NULL,
      description text,
      url text,
      last_synced_at timestamptz,
      sync_status text DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      selected boolean DEFAULT false,
      project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repos_visibility_check') THEN
        ALTER TABLE public.repos 
        ADD CONSTRAINT repos_visibility_check 
        CHECK (visibility IN ('public', 'private', 'internal'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repos_connection_id_provider_repo_id_key') THEN
        ALTER TABLE public.repos 
        ADD CONSTRAINT repos_connection_id_provider_repo_id_key 
        UNIQUE (connection_id, provider_repo_id);
      END IF;
    END $$;
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repos_connection_id' AND tablename = 'repos') THEN
        CREATE INDEX idx_repos_connection_id ON public.repos (connection_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repos_full_name' AND tablename = 'repos') THEN
        CREATE INDEX idx_repos_full_name ON public.repos (full_name);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repos_project_id' AND tablename = 'repos') THEN
        CREATE INDEX idx_repos_project_id ON public.repos (project_id);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'repos' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'provider_connections' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'whiteboards' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'projects' }, { ifExists: true, cascade: true });
  // Não removemos os enums pois podem ser usados por outras tabelas
};

