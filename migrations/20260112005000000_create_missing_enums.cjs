/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar todos os enums faltantes
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar todos os enums faltantes
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE public.audit_action AS ENUM ('CONNECT', 'CREATE_PR', 'REVIEW', 'MERGE', 'RULE_CHANGE', 'SYNC');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_conclusion') THEN
        CREATE TYPE public.check_conclusion AS ENUM ('SUCCESS', 'FAILURE', 'PENDING', 'CANCELLED');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_side') THEN
        CREATE TYPE public.comment_side AS ENUM ('LEFT', 'RIGHT');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_link_type') THEN
        CREATE TYPE public.issue_link_type AS ENUM ('BLOCKS', 'IS_BLOCKED_BY', 'RELATES');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merge_method') THEN
        CREATE TYPE public.merge_method AS ENUM ('MERGE', 'SQUASH', 'REBASE');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pr_state') THEN
        CREATE TYPE public.pr_state AS ENUM ('OPEN', 'MERGED', 'CLOSED');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_state') THEN
        CREATE TYPE public.review_state AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sprint_state') THEN
        CREATE TYPE public.sprint_state AS ENUM ('PLANNED', 'ACTIVE', 'DONE');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tarefa_priority') THEN
        CREATE TYPE public.tarefa_priority AS ENUM ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tarefa_type') THEN
        CREATE TYPE public.tarefa_type AS ENUM ('EPIC', 'TASK', 'SUBTASK', 'BUG', 'STORY');
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  // Não removemos enums pois podem ser usados por outras tabelas
};

