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
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'whiteboards' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'projects' }, { ifExists: true, cascade: true });
  // Não removemos o enum app_role pois pode ser usado por outras tabelas
};

