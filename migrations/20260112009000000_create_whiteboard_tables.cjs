/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar tabelas relacionadas a whiteboards
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // whiteboard_objects
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.whiteboard_objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      whiteboard_id uuid NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
      type text NOT NULL,
      properties jsonb NOT NULL DEFAULT '{}',
      z_index integer DEFAULT 0,
      locked boolean DEFAULT false,
      group_id uuid REFERENCES public.whiteboard_objects(id) ON DELETE SET NULL,
      linked_task_id uuid REFERENCES public.tarefas(id) ON DELETE SET NULL,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whiteboard_objects_whiteboard' AND tablename = 'whiteboard_objects') THEN
        CREATE INDEX idx_whiteboard_objects_whiteboard ON public.whiteboard_objects (whiteboard_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whiteboard_objects_zindex' AND tablename = 'whiteboard_objects') THEN
        CREATE INDEX idx_whiteboard_objects_zindex ON public.whiteboard_objects (whiteboard_id, z_index);
      END IF;
    END $$;
  `);

  // whiteboard_comments
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.whiteboard_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      whiteboard_id uuid NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
      object_id uuid REFERENCES public.whiteboard_objects(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
      content text NOT NULL,
      position_x double precision,
      position_y double precision,
      resolved boolean DEFAULT false,
      parent_comment_id uuid REFERENCES public.whiteboard_comments(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);

  // whiteboard_collaborators
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.whiteboard_collaborators (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      whiteboard_id uuid NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
      cursor_x double precision,
      cursor_y double precision,
      color text DEFAULT '#3B82F6',
      last_seen timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now(),
      UNIQUE (whiteboard_id, user_id)
    );
  `);

  // mentions
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.mentions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL REFERENCES public.whiteboard_comments(id) ON DELETE CASCADE,
      mentioned_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'mentions' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'whiteboard_collaborators' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'whiteboard_comments' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'whiteboard_objects' }, { ifExists: true, cascade: true });
};

