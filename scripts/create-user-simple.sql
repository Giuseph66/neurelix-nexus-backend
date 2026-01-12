-- ⚠️ ATENÇÃO: Este script NÃO funciona com o código atual!
-- O código usa bcrypt.hash() e bcrypt.compare(), não SHA-256.
-- 
-- Use o script Node.js: node scripts/create-user-with-bcrypt.js
-- 
-- OU use este SQL apenas se você gerar o hash bcrypt manualmente:
-- (você precisaria de um hash bcrypt válido, que começa com $2a$ ou $2b$)

-- Exemplo (substitua pelo hash bcrypt real):
-- INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
-- VALUES (
--   'user@exemplo.com',
--   '$2b$10$SEU_HASH_BCRYPT_AQUI...',  -- Hash bcrypt gerado externamente
--   '{"full_name":"User Exemplo"}'::jsonb
-- )
-- RETURNING id, email, created_at;

