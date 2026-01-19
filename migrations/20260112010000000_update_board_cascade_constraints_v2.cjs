/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration V2: Atualizar constraints de board_id para CASCADE DELETE
 * 
 * Esta migração altera as foreign keys de tarefas.board_id e sprints.board_id
 * de ON DELETE SET NULL para ON DELETE CASCADE, garantindo que quando um board
 * é deletado, todas as tarefas e sprints relacionadas também sejam deletadas.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Alterar constraint de tarefas.board_id de SET NULL para CASCADE
  pgm.sql(`
    ALTER TABLE public.tarefas
    DROP CONSTRAINT IF EXISTS tarefas_board_id_fkey;
    
    ALTER TABLE public.tarefas
    ADD CONSTRAINT tarefas_board_id_fkey 
    FOREIGN KEY (board_id) 
    REFERENCES public.boards(id) 
    ON DELETE CASCADE;
  `);

  // Alterar constraint de sprints.board_id de SET NULL para CASCADE
  pgm.sql(`
    ALTER TABLE public.sprints
    DROP CONSTRAINT IF EXISTS sprints_board_id_fkey;
    
    ALTER TABLE public.sprints
    ADD CONSTRAINT sprints_board_id_fkey 
    FOREIGN KEY (board_id) 
    REFERENCES public.boards(id) 
    ON DELETE CASCADE;
  `);
};

exports.down = (pgm) => {
  // Reverter constraint de tarefas.board_id para SET NULL
  pgm.sql(`
    ALTER TABLE public.tarefas
    DROP CONSTRAINT IF EXISTS tarefas_board_id_fkey;
    
    ALTER TABLE public.tarefas
    ADD CONSTRAINT tarefas_board_id_fkey 
    FOREIGN KEY (board_id) 
    REFERENCES public.boards(id) 
    ON DELETE SET NULL;
  `);

  // Reverter constraint de sprints.board_id para SET NULL
  pgm.sql(`
    ALTER TABLE public.sprints
    DROP CONSTRAINT IF EXISTS sprints_board_id_fkey;
    
    ALTER TABLE public.sprints
    ADD CONSTRAINT sprints_board_id_fkey 
    FOREIGN KEY (board_id) 
    REFERENCES public.boards(id) 
    ON DELETE SET NULL;
  `);
};

