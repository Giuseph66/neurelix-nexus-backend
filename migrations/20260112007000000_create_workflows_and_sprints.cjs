/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar tabelas de workflows e sprints
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // workflows
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.workflows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
      name text NOT NULL DEFAULT 'Default Workflow',
      is_default boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workflows_board_id' AND tablename = 'workflows') THEN
        CREATE INDEX idx_workflows_board_id ON public.workflows (board_id);
      END IF;
    END $$;
  `);

  // workflow_statuses
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.workflow_statuses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
      name text NOT NULL,
      color text DEFAULT '#6B7280',
      position integer DEFAULT 0 NOT NULL,
      is_initial boolean DEFAULT false,
      is_final boolean DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workflow_statuses_workflow_id' AND tablename = 'workflow_statuses') THEN
        CREATE INDEX idx_workflow_statuses_workflow_id ON public.workflow_statuses (workflow_id);
      END IF;
    END $$;
  `);

  // workflow_transitions
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.workflow_transitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
      from_status_id uuid NOT NULL REFERENCES public.workflow_statuses(id) ON DELETE CASCADE,
      to_status_id uuid NOT NULL REFERENCES public.workflow_statuses(id) ON DELETE CASCADE,
      name text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (workflow_id, from_status_id, to_status_id)
    );
  `);

  // sprints
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.sprints (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL,
      name text NOT NULL,
      goal text,
      start_date date,
      end_date date,
      state public.sprint_state NOT NULL DEFAULT 'PLANNED',
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'sprints' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'workflow_transitions' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'workflow_statuses' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'workflows' }, { ifExists: true, cascade: true });
};

