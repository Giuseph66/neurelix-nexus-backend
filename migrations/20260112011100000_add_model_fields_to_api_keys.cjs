/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 * 
 * Migration para adicionar campos de modelo (normal e alternativo) à tabela api_keys
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Adicionar campos de modelo
  pgm.sql(`
    ALTER TABLE public.api_keys
    ADD COLUMN IF NOT EXISTS model_primary text,
    ADD COLUMN IF NOT EXISTS model_fallback text;
  `);

  // Definir valores padrão baseados no provider
  pgm.sql(`
    UPDATE public.api_keys
    SET 
      model_primary = CASE 
        WHEN provider = 'GEMINI' THEN 'gemini-2.5-flash'
        WHEN provider = 'OPENAI' THEN 'gpt-5.1-chat-latest'
        ELSE NULL
      END,
      model_fallback = CASE 
        WHEN provider = 'GEMINI' THEN 'gemini-2.5-flash-lite'
        WHEN provider = 'OPENAI' THEN 'gpt-5.2-chat-latest'
        ELSE NULL
      END
    WHERE model_primary IS NULL OR model_fallback IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.api_keys
    DROP COLUMN IF EXISTS model_primary,
    DROP COLUMN IF EXISTS model_fallback;
  `);
};

