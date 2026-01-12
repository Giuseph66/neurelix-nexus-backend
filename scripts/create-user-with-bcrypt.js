#!/usr/bin/env node
/**
 * Script para criar um usuário com hash bcrypt (compatível com o código)
 * 
 * Uso: node scripts/create-user-with-bcrypt.js <email> <senha> <nome_completo>
 * Exemplo: node scripts/create-user-with-bcrypt.js user@exemplo.com senha123 "João Silva"
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function createUser() {
  const [email, password, fullName] = process.argv.slice(2);

  if (!email || !password || !fullName) {
    console.error('Uso: node scripts/create-user-with-bcrypt.js <email> <senha> <nome_completo>');
    console.error('Exemplo: node scripts/create-user-with-bcrypt.js user@exemplo.com senha123 "João Silva"');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Erro: DATABASE_URL não encontrado no .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // Verificar se usuário já existe
    const existing = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.error(`❌ Erro: Usuário com email ${email} já existe`);
      process.exit(1);
    }

    // Gerar hash bcrypt (mesmo que o código usa: bcrypt.hash(password, 10))
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Hash da senha gerado com bcrypt');

    // Inserir usuário
    const result = await client.query(
      `INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING id, email, created_at`,
      [email, passwordHash, { full_name: fullName }]
    );

    const user = result.rows[0];
    console.log('✅ Usuário criado:', user);

    // Criar profile também (como o código faz)
    await client.query(
      `INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
      [user.id, fullName]
    );
    console.log('✅ Profile criado');

    console.log('\n🎉 Usuário criado com sucesso!');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Nome: ${fullName}`);
    console.log(`\nVocê pode fazer login com: email="${email}" e password="${password}"`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createUser();

