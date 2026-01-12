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

  pgm.createIndex({ schema: 'public', name: 'projects' }, 'slug', { unique: true });
  pgm.createIndex({ schema: 'public', name: 'projects' }, 'created_by');

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

  pgm.createIndex({ schema: 'public', name: 'whiteboards' }, 'project_id');
  pgm.createIndex({ schema: 'public', name: 'whiteboards' }, 'parent_branch_id');
  pgm.createIndex({ schema: 'public', name: 'whiteboards' }, 'created_by');
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'whiteboards' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema: 'public', name: 'projects' }, { ifExists: true, cascade: true });
  // Não removemos o enum app_role pois pode ser usado por outras tabelas
};

