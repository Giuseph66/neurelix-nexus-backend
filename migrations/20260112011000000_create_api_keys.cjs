/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar tabela de API keys (Gemini e OpenAI)
 * Suporta múltiplas chaves por projeto com sistema rotativo
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar enum api_provider se não existir
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_provider') THEN
        CREATE TYPE public.api_provider AS ENUM ('GEMINI', 'OPENAI');
      END IF;
    END $$;
  `);

  // Criar tabela api_keys
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.api_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      provider public.api_provider NOT NULL,
      api_key text NOT NULL,
      name text,
      timeout_seconds integer DEFAULT 60,
      is_active boolean DEFAULT true,
      last_used_at timestamptz,
      error_count integer DEFAULT 0,
      last_error_at timestamptz,
      last_error_message text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Criar índices
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_project_id' AND tablename = 'api_keys') THEN
        CREATE INDEX idx_api_keys_project_id ON public.api_keys (project_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_user_id' AND tablename = 'api_keys') THEN
        CREATE INDEX idx_api_keys_user_id ON public.api_keys (user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_provider' AND tablename = 'api_keys') THEN
        CREATE INDEX idx_api_keys_provider ON public.api_keys (provider);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_active' AND tablename = 'api_keys') THEN
        CREATE INDEX idx_api_keys_active ON public.api_keys (project_id, provider, is_active) WHERE is_active = true;
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'api_keys' }, { ifExists: true, cascade: true });
  // Não removemos o enum api_provider pois pode ser usado por outras tabelas no futuro
};

