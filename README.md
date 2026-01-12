# Neurelix Nexus Backend

Backend da plataforma Neurelix Nexus, uma solução unificada para gestão de projetos, tarefas, whiteboards colaborativos e integração com Git.

## 🚀 Tecnologias

- **Fastify** - Framework web rápido e eficiente
- **TypeScript** - Tipagem estática
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **WebSocket** - Comunicação em tempo real
- **Swagger/OpenAPI** - Documentação da API
- **Docker** - Containerização do banco de dados

## 📋 Pré-requisitos

- Node.js 18+ ou superior
- PostgreSQL 16+ (ou Docker para usar o docker-compose)
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório e navegue até a pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (veja seção [Configuração](#-configuração))

4. Inicie o banco de dados (se usando Docker):
```bash
docker-compose up -d
```

5. Execute as migrações do banco de dados:
```bash
npm run db:migrate
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do diretório `backend` com as seguintes variáveis:

### Variáveis Obrigatórias

```env
# Servidor
PORT=8081
CORS_ORIGIN=http://localhost:5173

# Banco de Dados
DATABASE_URL=postgresql://neurelix:neurelix@localhost:5432/neurelix

# Autenticação JWT
JWT_SECRET=seu-secret-jwt-super-seguro-aqui
JWT_ACCESS_TTL_SECONDS=3600
JWT_REFRESH_TTL_SECONDS=2592000
```

### Variáveis Opcionais

```env
# GitHub Integration
GITHUB_CLIENT_ID=seu-github-client-id
GITHUB_CLIENT_SECRET=seu-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:8081/auth/github/callback
GITHUB_WEBHOOK_SECRET=seu-webhook-secret

# Frontend
FRONTEND_URL=http://localhost:5173

# Gemini AI (para assistente)
GEMINI_API_KEY=sua-gemini-api-key
```

## 🏃 Executando

### Modo Desenvolvimento

```bash
npm run dev
```

O servidor será iniciado em `http://localhost:8081` com hot-reload ativado.

### Modo Produção

1. Compile o projeto:
```bash
npm run build
```

2. Inicie o servidor:
```bash
npm start
```

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── db/              # Configuração do pool de conexões
│   ├── plugins/          # Plugins do Fastify (auth, env)
│   ├── routes/           # Rotas da API
│   │   ├── auth.ts       # Autenticação e autorização
│   │   ├── projects.ts   # Gestão de projetos
│   │   ├── tarefas.ts    # Gestão de tarefas
│   │   ├── whiteboards.ts # Whiteboards colaborativos
│   │   ├── boards.ts     # Quadros Kanban
│   │   ├── sprints.ts    # Gestão de sprints
│   │   ├── roles.ts      # Gestão de roles e permissões
│   │   ├── workflows.ts  # Workflows
│   │   ├── mentions.ts   # Sistema de menções
│   │   └── functions.ts  # Funções auxiliares
│   ├── realtime/         # WebSocket para tempo real
│   ├── types/            # Definições de tipos TypeScript
│   ├── utils/            # Utilitários
│   └── server.ts         # Arquivo principal do servidor
├── migrations/            # Migrações do banco de dados
├── scripts/              # Scripts auxiliares
├── docs/                 # Documentação
└── docker-compose.yml    # Configuração Docker para PostgreSQL
```

## 📜 Scripts Disponíveis

- `npm run dev` - Inicia o servidor em modo desenvolvimento com hot-reload
- `npm run build` - Compila o TypeScript para JavaScript
- `npm start` - Inicia o servidor em modo produção
- `npm run db:migrate` - Executa as migrações do banco de dados
- `npm run db:migrate:up` - Alias para `db:migrate`
- `npm run db:apply:supabase` - Aplica migrações do Supabase

## 🔌 API e Documentação

A API está documentada usando Swagger/OpenAPI. Após iniciar o servidor, acesse:

- **Documentação Swagger UI**: `http://localhost:8081/docs`
- **Health Check**: `http://localhost:8081/health`

### Principais Endpoints

- `/auth/*` - Autenticação e autorização
- `/projects/*` - Gestão de projetos
- `/tarefas/*` - Gestão de tarefas
- `/whiteboards/*` - Whiteboards colaborativos
- `/boards/*` - Quadros Kanban
- `/sprints/*` - Gestão de sprints
- `/roles/*` - Gestão de roles e permissões
- `/workflows/*` - Workflows
- `/mentions/*` - Sistema de menções

## 🗄️ Banco de Dados

O projeto usa PostgreSQL como banco de dados. As migrações estão na pasta `migrations/` e são gerenciadas pelo `node-pg-migrate`.

### Usando Docker

O `docker-compose.yml` fornece uma instância PostgreSQL pronta para uso:

```bash
# Iniciar o banco
docker-compose up -d

# Parar o banco
docker-compose down

# Ver logs
docker-compose logs -f db
```

### Migrações

Para criar uma nova migração:

```bash
npx node-pg-migrate create nome-da-migracao -m migrations
```

Para executar migrações pendentes:

```bash
npm run db:migrate
```

## 🔐 Autenticação

O backend usa JWT (JSON Web Tokens) para autenticação:

- **Access Token**: Token de curta duração (padrão: 1 hora)
- **Refresh Token**: Token de longa duração (padrão: 30 dias)

Os tokens são enviados via cookies ou headers `Authorization: Bearer <token>`.

## 🌐 WebSocket

O servidor suporta WebSocket para funcionalidades em tempo real, como:
- Colaboração em whiteboards
- Notificações em tempo real
- Presença de usuários

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
2. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
3. Push para a branch (`git push origin feature/nova-feature`)
4. Abra um Pull Request

## 📝 Licença

Este projeto é privado e proprietário. Todos os direitos são reservados à Neurelix.

Para mais informações, consulte o arquivo [LICENSE.md](../LICENSE.md) na raiz do repositório.

## 🆘 Suporte

Para problemas ou dúvidas, abra uma issue no repositório.
