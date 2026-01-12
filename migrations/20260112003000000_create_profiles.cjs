/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para criar a tabela profiles (necessária para auth)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar tabela profiles
  pgm.createTable(
    { schema: 'public', name: 'profiles' },
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      user_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        references: 'auth.users(id)',
        onDelete: 'CASCADE',
      },
      full_name: {
        type: 'text',
      },
      avatar_url: {
        type: 'text',
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

  // Criar índices
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_user_id_index' AND tablename = 'profiles') THEN
        CREATE INDEX profiles_user_id_index ON public.profiles (user_id);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'profiles' }, { ifExists: true, cascade: true });
};

