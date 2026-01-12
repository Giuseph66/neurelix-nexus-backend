/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar tabelas de tarefas e relacionadas
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // tarefas (tabela principal)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL,
      key text NOT NULL UNIQUE,
      type public.tarefa_type NOT NULL DEFAULT 'TASK',
      title text NOT NULL,
      description text,
      status_id uuid REFERENCES public.workflow_statuses(id) ON DELETE SET NULL,
      priority public.tarefa_priority NOT NULL DEFAULT 'MEDIUM',
      assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      parent_id uuid REFERENCES public.tarefas(id) ON DELETE CASCADE,
      epic_id uuid REFERENCES public.tarefas(id) ON DELETE SET NULL,
      sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL,
      labels text[] DEFAULT '{}',
      due_date date,
      estimated_hours numeric(10,2),
      backlog_position integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefas_project_id' AND tablename = 'tarefas') THEN
        CREATE INDEX idx_tarefas_project_id ON public.tarefas (project_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefas_board_id' AND tablename = 'tarefas') THEN
        CREATE INDEX idx_tarefas_board_id ON public.tarefas (board_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefas_status_id' AND tablename = 'tarefas') THEN
        CREATE INDEX idx_tarefas_status_id ON public.tarefas (status_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefas_assignee_id' AND tablename = 'tarefas') THEN
        CREATE INDEX idx_tarefas_assignee_id ON public.tarefas (assignee_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefas_epic_id' AND tablename = 'tarefas') THEN
        CREATE INDEX idx_tarefas_epic_id ON public.tarefas (epic_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefas_sprint_id' AND tablename = 'tarefas') THEN
        CREATE INDEX idx_tarefas_sprint_id ON public.tarefas (sprint_id);
      END IF;
    END $$;
  `);

  // tarefa_comments
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefa_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefa_comments_tarefa_id' AND tablename = 'tarefa_comments') THEN
        CREATE INDEX idx_tarefa_comments_tarefa_id ON public.tarefa_comments (tarefa_id);
      END IF;
    END $$;
  `);

  // tarefa_git_links
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefa_git_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
      provider text NOT NULL DEFAULT 'github',
      branch text,
      commit_sha text,
      pr_number integer,
      url text,
      metadata jsonb DEFAULT '{}',
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      pr_id uuid REFERENCES public.pull_requests(id) ON DELETE SET NULL,
      commit_ids text[] DEFAULT '{}'
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefa_git_links_pr_id' AND tablename = 'tarefa_git_links') THEN
        CREATE INDEX idx_tarefa_git_links_pr_id ON public.tarefa_git_links (pr_id);
      END IF;
    END $$;
  `);

  // tarefa_links
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefa_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source_tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
      target_tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
      link_type public.issue_link_type NOT NULL,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (source_tarefa_id, target_tarefa_id, link_type)
    );
  `);

  // tarefa_watchers
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefa_watchers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tarefa_id, user_id)
    );
  `);

  // tarefa_whiteboard_origin
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefa_whiteboard_origin (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tarefa_id uuid NOT NULL UNIQUE REFERENCES public.tarefas(id) ON DELETE CASCADE,
      whiteboard_id uuid NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
      node_ids text[] DEFAULT '{}',
      area_bounds jsonb,
      snapshot_title text,
      snapshot_preview text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // tarefa_activity_log
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.tarefa_activity_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      action text NOT NULL,
      field_name text,
      old_value text,
      new_value text,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tarefa_activity_log_tarefa_id' AND tablename = 'tarefa_activity_log') THEN
        CREATE INDEX idx_tarefa_activity_log_tarefa_id ON public.tarefa_activity_log (tarefa_id);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'tarefa_activity_log' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'tarefa_whiteboard_origin' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'tarefa_watchers' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'tarefa_links' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'tarefa_git_links' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'tarefa_comments' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'tarefas' }, { ifExists: true, cascade: true });
};

