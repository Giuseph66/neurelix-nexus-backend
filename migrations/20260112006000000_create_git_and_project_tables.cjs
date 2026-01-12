/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar tabelas Git e relacionadas a projetos
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // project_repos (liga projetos a repositórios)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.project_repos (
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      repo_id uuid NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
      branch_template text DEFAULT 'feature/{taskKey}-{title}',
      merge_policy public.merge_method DEFAULT 'MERGE',
      min_reviews integer DEFAULT 1,
      require_checks boolean DEFAULT false,
      auto_close_tarefa_on_merge boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (project_id, repo_id)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_repos_project' AND tablename = 'project_repos') THEN
        CREATE INDEX idx_project_repos_project ON public.project_repos (project_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_repos_repo' AND tablename = 'project_repos') THEN
        CREATE INDEX idx_project_repos_repo ON public.project_repos (repo_id);
      END IF;
    END $$;
  `);

  // project_sequences (para gerar chaves de tarefas)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.project_sequences (
      project_id uuid NOT NULL PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
      last_sequence integer DEFAULT 0 NOT NULL
    );
  `);

  // branches
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.branches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      repo_id uuid NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
      name text NOT NULL,
      last_commit_sha text,
      is_default boolean DEFAULT false,
      protected boolean DEFAULT false,
      ahead_count integer DEFAULT 0,
      behind_count integer DEFAULT 0,
      last_synced_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (repo_id, name)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_branches_repo_id' AND tablename = 'branches') THEN
        CREATE INDEX idx_branches_repo_id ON public.branches (repo_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_branches_name' AND tablename = 'branches') THEN
        CREATE INDEX idx_branches_name ON public.branches (name);
      END IF;
    END $$;
  `);

  // commits
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.commits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      repo_id uuid NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
      sha text NOT NULL,
      branch_name text,
      author_name text NOT NULL,
      author_email text,
      message text NOT NULL,
      date timestamptz NOT NULL,
      url text,
      parent_shas text[],
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (repo_id, sha)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commits_repo_id' AND tablename = 'commits') THEN
        CREATE INDEX idx_commits_repo_id ON public.commits (repo_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commits_sha' AND tablename = 'commits') THEN
        CREATE INDEX idx_commits_sha ON public.commits (sha);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commits_branch' AND tablename = 'commits') THEN
        CREATE INDEX idx_commits_branch ON public.commits (repo_id, branch_name);
      END IF;
    END $$;
  `);

  // pull_requests
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.pull_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      repo_id uuid NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
      number integer NOT NULL,
      title text NOT NULL,
      description text,
      state public.pr_state NOT NULL DEFAULT 'OPEN',
      source_branch text NOT NULL,
      target_branch text NOT NULL DEFAULT 'main',
      author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      author_username text,
      draft boolean DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      merged_at timestamptz,
      merge_commit_sha text,
      url text,
      UNIQUE (repo_id, number)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pull_requests_repo_state' AND tablename = 'pull_requests') THEN
        CREATE INDEX idx_pull_requests_repo_state ON public.pull_requests (repo_id, state);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pull_requests_state' AND tablename = 'pull_requests') THEN
        CREATE INDEX idx_pull_requests_state ON public.pull_requests (state);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pull_requests_author' AND tablename = 'pull_requests') THEN
        CREATE INDEX idx_pull_requests_author ON public.pull_requests (author_id);
      END IF;
    END $$;
  `);

  // pr_comments
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.pr_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pr_id uuid NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      author_username text,
      body text NOT NULL,
      line_number integer,
      path text,
      side public.comment_side,
      in_reply_to_id uuid REFERENCES public.pr_comments(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pr_comments_pr_id' AND tablename = 'pr_comments') THEN
        CREATE INDEX idx_pr_comments_pr_id ON public.pr_comments (pr_id);
      END IF;
    END $$;
  `);

  // pr_reviews
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.pr_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pr_id uuid NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
      reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      reviewer_username text,
      state public.review_state NOT NULL,
      body text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (pr_id, reviewer_id)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pr_reviews_pr_id' AND tablename = 'pr_reviews') THEN
        CREATE INDEX idx_pr_reviews_pr_id ON public.pr_reviews (pr_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pr_reviews_reviewer' AND tablename = 'pr_reviews') THEN
        CREATE INDEX idx_pr_reviews_reviewer ON public.pr_reviews (reviewer_id);
      END IF;
    END $$;
  `);

  // pr_status_checks
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.pr_status_checks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pr_id uuid NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
      name text NOT NULL,
      conclusion public.check_conclusion NOT NULL DEFAULT 'PENDING',
      details_url text,
      started_at timestamptz,
      completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (pr_id, name)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pr_status_checks_pr_id' AND tablename = 'pr_status_checks') THEN
        CREATE INDEX idx_pr_status_checks_pr_id ON public.pr_status_checks (pr_id);
      END IF;
    END $$;
  `);

  // github_oauth_states
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.github_oauth_states (
      state uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL DEFAULT (now() + '5 minutes'::interval)
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_github_oauth_states_expires' AND tablename = 'github_oauth_states') THEN
        CREATE INDEX idx_github_oauth_states_expires ON public.github_oauth_states (expires_at);
      END IF;
    END $$;
  `);

  // audit_events
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.audit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
      action public.audit_action NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid,
      before jsonb,
      after jsonb,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_events_actor' AND tablename = 'audit_events') THEN
        CREATE INDEX idx_audit_events_actor ON public.audit_events (actor_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_events_created' AND tablename = 'audit_events') THEN
        CREATE INDEX idx_audit_events_created ON public.audit_events (created_at DESC);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_events_entity' AND tablename = 'audit_events') THEN
        CREATE INDEX idx_audit_events_entity ON public.audit_events (entity_type, entity_id);
      END IF;
    END $$;
  `);

  // user_roles
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role public.app_role NOT NULL,
      UNIQUE (user_id, role)
    );
  `);

  // webhook_event_logs
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.webhook_event_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type text NOT NULL,
      delivery_id text NOT NULL UNIQUE,
      signature_ok boolean DEFAULT false,
      processed_ok boolean DEFAULT false,
      error text,
      payload jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_webhook_event_logs_created' AND tablename = 'webhook_event_logs') THEN
        CREATE INDEX idx_webhook_event_logs_created ON public.webhook_event_logs (created_at DESC);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_webhook_event_logs_event_type' AND tablename = 'webhook_event_logs') THEN
        CREATE INDEX idx_webhook_event_logs_event_type ON public.webhook_event_logs (event_type);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'webhook_event_logs' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'user_roles' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'audit_events' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'github_oauth_states' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'pr_status_checks' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'pr_reviews' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'pr_comments' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'pull_requests' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'commits' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'branches' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'project_sequences' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'project_repos' }, { ifExists: true, cascade: true });
};

