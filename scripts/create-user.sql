-- ⚠️ IMPORTANTE: O código usa bcrypt para hash/verificação de senha!
-- 
-- O arquivo backend/src/routes/auth.ts usa:
--   - bcrypt.hash(password, 10) para criar senha
--   - bcrypt.compare(password, encrypted_password) para verificar
--
-- ============================================
-- RECOMENDADO: Use o script Node.js
-- ============================================
-- node scripts/create-user-with-bcrypt.js <email> <senha> <nome>
--
-- ============================================
-- Opção 1: Com pgcrypto (bcrypt no PostgreSQL)
-- ============================================
-- ATENÇÃO: O hash gerado por pgcrypto.crypt() pode não ser compatível
-- com bcrypt do Node.js! Use apenas se testar primeiro.

-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
-- VALUES (
--   'user@exemplo.com',
--   crypt('SUA_SENHA_FORTE_AQUI', gen_salt('bf')),
--   '{"full_name":"User Exemplo"}'::jsonb
-- )
-- RETURNING id, email, created_at;

-- ============================================
-- Opção 2: Hash bcrypt gerado externamente
-- ============================================
-- Se você já tem um hash bcrypt válido (gerado por Node.js ou outra ferramenta):

-- INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
-- VALUES (
--   'user@exemplo.com',
--   '$2b$10$SEU_HASH_BCRYPT_COMPLETO_AQUI...',  -- Hash bcrypt válido
--   '{"full_name":"User Exemplo"}'::jsonb
-- )
-- RETURNING id, email, created_at;

