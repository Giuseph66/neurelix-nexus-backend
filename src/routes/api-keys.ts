import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createApiKeySchema = z.object({
  provider: z.enum(['GEMINI', 'OPENAI']),
  api_key: z.string().min(1),
  name: z.string().optional(),
  timeout_seconds: z.number().int().positive().optional(),
  model_primary: z.string().optional(),
  model_fallback: z.string().optional(),
});

const updateApiKeySchema = z.object({
  api_key: z.string().min(1).optional(),
  name: z.string().optional(),
  timeout_seconds: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  model_primary: z.string().optional(),
  model_fallback: z.string().optional(),
});

export const apiKeysRoutes: FastifyPluginAsync = async (app) => {
  // GET /api-keys?projectId=xxx - List API keys for a project
  app.get('/api-keys', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const projectId = (req.query as { projectId?: string }).projectId;
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }

    const userId = (req.user as any)?.userId as string;

    // Verify user has access to project
    const memberCheck = await app.db.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    const creatorCheck = await app.db.query(
      'SELECT id FROM projects WHERE id = $1 AND created_by = $2',
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0 && creatorCheck.rows.length === 0) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const result = await app.db.query(
      `SELECT 
        id,
        project_id,
        user_id,
        provider,
        name,
        timeout_seconds,
        is_active,
        last_used_at,
        error_count,
        last_error_at,
        model_primary,
        model_fallback,
        created_at,
        updated_at,
        -- Mask API key, show only last 4 characters
        CASE 
          WHEN length(api_key) > 4 THEN '••••' || right(api_key, 4)
          ELSE '••••'
        END as api_key_preview
      FROM api_keys 
      WHERE project_id = $1 
      ORDER BY created_at DESC`,
      [projectId]
    );

    return reply.send(result.rows);
  });

  // POST /api-keys - Create API key
  app.post('/api-keys', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = (req.user as any)?.userId as string;
    const body = createApiKeySchema.parse(req.body);
    const projectId = (req.body as any).project_id;

    if (!projectId) {
      return reply.code(400).send({ error: 'project_id is required' });
    }

    // Verify user has access to project
    const memberCheck = await app.db.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    const creatorCheck = await app.db.query(
      'SELECT id FROM projects WHERE id = $1 AND created_by = $2',
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0 && creatorCheck.rows.length === 0) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Definir modelos padrão se não fornecidos
    const defaultModels = {
      GEMINI: { primary: 'gemini-2.5-flash', fallback: 'gemini-2.5-flash-lite' },
      OPENAI: { primary: 'gpt-5.1-chat-latest', fallback: 'gpt-5.2-chat-latest' },
    };

    const modelPrimary = body.model_primary || defaultModels[body.provider].primary;
    const modelFallback = body.model_fallback || defaultModels[body.provider].fallback;

    const result = await app.db.query(
      `INSERT INTO api_keys (project_id, user_id, provider, api_key, name, timeout_seconds, model_primary, model_fallback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING 
         id,
         project_id,
         user_id,
         provider,
         name,
         timeout_seconds,
         is_active,
         last_used_at,
         error_count,
         last_error_at,
         model_primary,
         model_fallback,
         created_at,
         updated_at,
         CASE 
           WHEN length(api_key) > 4 THEN '••••' || right(api_key, 4)
           ELSE '••••'
         END as api_key_preview`,
      [
        projectId,
        userId,
        body.provider,
        body.api_key,
        body.name || null,
        body.timeout_seconds || 60,
        modelPrimary,
        modelFallback,
      ]
    );

    return reply.code(201).send(result.rows[0]);
  });

  // PUT /api-keys/:id - Update API key
  app.put('/api-keys/:id', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any)?.userId as string;
    const body = updateApiKeySchema.parse(req.body);

    // Verify user owns the API key or has access to the project
    const keyCheck = await app.db.query(
      `SELECT ak.*, p.created_by 
       FROM api_keys ak
       INNER JOIN projects p ON p.id = ak.project_id
       WHERE ak.id = $1`,
      [id]
    );

    if (keyCheck.rows.length === 0) {
      return reply.code(404).send({ error: 'API key not found' });
    }

    const apiKey = keyCheck.rows[0];
    const isOwner = apiKey.user_id === userId;
    const isProjectCreator = apiKey.created_by === userId;

    // Check if user is project member
    const memberCheck = await app.db.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [apiKey.project_id, userId]
    );

    if (!isOwner && !isProjectCreator && memberCheck.rows.length === 0) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.api_key !== undefined) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(body.api_key);
    }
    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name || null);
    }
    if (body.timeout_seconds !== undefined) {
      updates.push(`timeout_seconds = $${paramIndex++}`);
      values.push(body.timeout_seconds);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }
    if (body.model_primary !== undefined) {
      updates.push(`model_primary = $${paramIndex++}`);
      values.push(body.model_primary);
    }
    if (body.model_fallback !== undefined) {
      updates.push(`model_fallback = $${paramIndex++}`);
      values.push(body.model_fallback);
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    const result = await app.db.query(
      `UPDATE api_keys 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING 
         id,
         project_id,
         user_id,
         provider,
         name,
         timeout_seconds,
         is_active,
         last_used_at,
         error_count,
         last_error_at,
         model_primary,
         model_fallback,
         created_at,
         updated_at,
         CASE 
           WHEN length(api_key) > 4 THEN '••••' || right(api_key, 4)
           ELSE '••••'
         END as api_key_preview`,
      values
    );

    return reply.send(result.rows[0]);
  });

  // DELETE /api-keys/:id - Delete API key
  app.delete('/api-keys/:id', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any)?.userId as string;

    // Verify user owns the API key or has access to the project
    const keyCheck = await app.db.query(
      `SELECT ak.*, p.created_by 
       FROM api_keys ak
       INNER JOIN projects p ON p.id = ak.project_id
       WHERE ak.id = $1`,
      [id]
    );

    if (keyCheck.rows.length === 0) {
      return reply.code(404).send({ error: 'API key not found' });
    }

    const apiKey = keyCheck.rows[0];
    const isOwner = apiKey.user_id === userId;
    const isProjectCreator = apiKey.created_by === userId;

    // Check if user is project member
    const memberCheck = await app.db.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [apiKey.project_id, userId]
    );

    if (!isOwner && !isProjectCreator && memberCheck.rows.length === 0) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    await app.db.query('DELETE FROM api_keys WHERE id = $1', [id]);

    return reply.code(204).send();
  });

  // GET /api-keys/:id/key - Get full API key (only for owner)
  app.get('/api-keys/:id/key', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any)?.userId as string;

    // Verify user owns the API key
    const keyCheck = await app.db.query(
      'SELECT api_key FROM api_keys WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (keyCheck.rows.length === 0) {
      return reply.code(404).send({ error: 'API key not found or access denied' });
    }

    return reply.send({ api_key: keyCheck.rows[0].api_key });
  });

  // POST /api-keys/test - Test API key validity
  app.post('/api-keys/test', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { provider, api_key, model_primary } = z.object({
      provider: z.enum(['GEMINI', 'OPENAI']),
      api_key: z.string().min(1),
      model_primary: z.string().optional(),
    }).parse(req.body);

    try {
      if (provider === 'GEMINI') {
        const model = model_primary || 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': api_key,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Test' }]
            }],
            generationConfig: {
              maxOutputTokens: 1,
            },
          }),
        });

        if (response.status === 401 || response.status === 403) {
          return reply.send({ 
            valid: false, 
            message: 'Chave inválida ou não autorizada' 
          });
        }

        if (response.status === 429) {
          return reply.send({ 
            valid: true, 
            message: 'Chave válida, mas limite de requisições excedido (rate limit)' 
          });
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return reply.send({ 
            valid: false, 
            message: errorData.error?.message || `Erro ${response.status}: ${response.statusText}` 
          });
        }

        return reply.send({ 
          valid: true, 
          message: 'Chave válida e funcionando corretamente!' 
        });
      } else if (provider === 'OPENAI') {
        const model = model_primary || 'gpt-5.1-chat-latest';
        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 1,
          }),
        });

        if (response.status === 401 || response.status === 403) {
          return reply.send({ 
            valid: false, 
            message: 'Chave inválida ou não autorizada' 
          });
        }

        if (response.status === 429) {
          return reply.send({ 
            valid: true, 
            message: 'Chave válida, mas limite de requisições excedido (rate limit)' 
          });
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return reply.send({ 
            valid: false, 
            message: errorData.error?.message || `Erro ${response.status}: ${response.statusText}` 
          });
        }

        return reply.send({ 
          valid: true, 
          message: 'Chave válida e funcionando corretamente!' 
        });
      }

      return reply.code(400).send({ error: 'Provider não suportado' });
    } catch (error) {
      return reply.send({ 
        valid: false, 
        message: error instanceof Error ? error.message : 'Erro ao testar chave' 
      });
    }
  });

  // POST /api-keys/:id/reset-errors - Reset error count (for manual recovery)
  app.post('/api-keys/:id/reset-errors', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any)?.userId as string;

    // Verify user owns the API key
    const keyCheck = await app.db.query(
      'SELECT user_id FROM api_keys WHERE id = $1',
      [id]
    );

    if (keyCheck.rows.length === 0) {
      return reply.code(404).send({ error: 'API key not found' });
    }

    if (keyCheck.rows[0].user_id !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const result = await app.db.query(
      `UPDATE api_keys 
       SET error_count = 0, last_error_at = NULL, last_error_message = NULL, updated_at = now()
       WHERE id = $1 
       RETURNING 
         id,
         project_id,
         user_id,
         provider,
         name,
         timeout_seconds,
         is_active,
         last_used_at,
         error_count,
         last_error_at,
         model_primary,
         model_fallback,
         created_at,
         updated_at,
         CASE 
           WHEN length(api_key) > 4 THEN '••••' || right(api_key, 4)
           ELSE '••••'
         END as api_key_preview`,
      [id]
    );

    return reply.send(result.rows[0]);
  });
};

