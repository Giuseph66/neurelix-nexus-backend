/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration de limpeza: remove o registro da migration duplicada
 * que foi executada parcialmente (20260110175000000_create_base_tables)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Remover o registro da migration duplicada se existir
  pgm.sql(`
    DELETE FROM public.pgmigrations 
    WHERE name = '20260110175000000_create_base_tables';
  `);
};

exports.down = (pgm) => {
  // Não fazemos nada no down - não queremos recriar o registro da migration duplicada
};

