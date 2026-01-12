/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar a tabela boards (necessária para tarefas/kanban)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar enum board_type se não existir
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_type') THEN
        CREATE TYPE public.board_type AS ENUM ('KANBAN', 'SCRUM');
      END IF;
    END $$;
  `);

  // Criar tabela boards
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.boards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      type public.board_type NOT NULL DEFAULT 'KANBAN',
      is_favorite boolean DEFAULT false,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Criar índices
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_boards_project_id' AND tablename = 'boards') THEN
        CREATE INDEX idx_boards_project_id ON public.boards (project_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_boards_created_by' AND tablename = 'boards') THEN
        CREATE INDEX idx_boards_created_by ON public.boards (created_by);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'boards' }, { ifExists: true, cascade: true });
  // Não removemos o enum board_type pois pode ser usado por outras tabelas
};

