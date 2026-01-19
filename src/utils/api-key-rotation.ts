/**
 * Sistema rotativo de chaves de API
 * Gerencia a rotação automática de chaves quando há erros/timeouts
 */

interface ApiKey {
  id: string;
  project_id: string;
  provider: 'GEMINI' | 'OPENAI';
  api_key: string;
  timeout_seconds: number;
  is_active: boolean;
  error_count: number;
  last_error_at: string | null;
  last_used_at: string | null;
  model_primary?: string | null;
  model_fallback?: string | null;
}

interface ApiKeyRotationResult {
  apiKey: string;
  keyId: string;
  modelPrimary: string;
  modelFallback: string;
  shouldRetry: boolean;
}

/**
 * Obtém a próxima chave de API disponível para um projeto
 * Implementa rotação baseada em:
 * - Chaves ativas primeiro
 * - Menor contagem de erros
 * - Mais recentemente usadas (se não tiveram erros)
 */
export async function getNextApiKey(
  db: any,
  projectId: string,
  provider: 'GEMINI' | 'OPENAI'
): Promise<ApiKey | null> {
  const result = await db.query<ApiKey>(
    `SELECT 
      id,
      project_id,
      provider,
      api_key,
      timeout_seconds,
      is_active,
      error_count,
      last_error_at,
      last_used_at,
      model_primary,
      model_fallback
    FROM api_keys
    WHERE project_id = $1 
      AND provider = $2
      AND is_active = true
    ORDER BY 
      -- Priorizar chaves sem erros
      CASE WHEN error_count = 0 THEN 0 ELSE 1 END,
      -- Entre chaves sem erros, priorizar as mais recentemente usadas
      CASE WHEN error_count = 0 THEN COALESCE(last_used_at, '1970-01-01'::timestamptz) END DESC,
      -- Entre chaves com erros, priorizar as com menos erros
      error_count ASC,
      -- Como último critério, usar as mais antigas (menos usadas)
      COALESCE(last_used_at, created_at) ASC
    LIMIT 1`,
    [projectId, provider]
  );

  return result.rows[0] || null;
}

/**
 * Registra uso bem-sucedido de uma chave de API
 */
export async function recordApiKeySuccess(
  db: any,
  keyId: string
): Promise<void> {
  await db.query(
    `UPDATE api_keys 
     SET last_used_at = now(),
         error_count = 0,
         last_error_at = NULL,
         last_error_message = NULL,
         updated_at = now()
     WHERE id = $1`,
    [keyId]
  );
}

/**
 * Registra erro em uma chave de API
 * Se o erro for de timeout/rate limit, incrementa o contador
 * Se o contador passar de um threshold, marca como inativa temporariamente
 */
export async function recordApiKeyError(
  db: any,
  keyId: string,
  errorMessage: string,
  isTimeoutOrRateLimit: boolean = false
): Promise<void> {
  if (isTimeoutOrRateLimit) {
    // Incrementa contador de erros para timeouts/rate limits
    await db.query(
      `UPDATE api_keys 
       SET error_count = error_count + 1,
           last_error_at = now(),
           last_error_message = $2,
           -- Se tiver mais de 3 erros consecutivos, desativa temporariamente
           is_active = CASE WHEN error_count + 1 >= 3 THEN false ELSE is_active END,
           updated_at = now()
       WHERE id = $1`,
      [keyId, errorMessage]
    );
  } else {
    // Para outros erros, apenas registra mas não incrementa muito o contador
    await db.query(
      `UPDATE api_keys 
       SET last_error_at = now(),
           last_error_message = $2,
           updated_at = now()
       WHERE id = $1`,
      [keyId, errorMessage]
    );
  }
}

/**
 * Tenta usar uma chave de API com rotação automática
 * Retorna a chave a ser usada e se deve tentar novamente
 */
export async function getApiKeyWithRotation(
  db: any,
  projectId: string,
  provider: 'GEMINI' | 'OPENAI'
): Promise<ApiKeyRotationResult> {
  const apiKey = await getNextApiKey(db, projectId, provider);

  if (!apiKey) {
    throw new Error(`Nenhuma chave de API ${provider} ativa encontrada para este projeto`);
  }

  // Definir modelos padrão se não configurados
  const defaultModels = {
    GEMINI: { primary: 'gemini-2.5-flash', fallback: 'gemini-2.5-flash-lite' },
    OPENAI: { primary: 'gpt-5.1-chat-latest', fallback: 'gpt-5.2-chat-latest' },
  };

  const modelPrimary = apiKey.model_primary || defaultModels[provider].primary;
  const modelFallback = apiKey.model_fallback || defaultModels[provider].fallback;

  // Retorna a chave para uso
  return {
    apiKey: apiKey.api_key,
    keyId: apiKey.id,
    modelPrimary,
    modelFallback,
    shouldRetry: false,
  };
}

/**
 * Verifica se um erro é de timeout ou rate limit
 */
export function isTimeoutOrRateLimitError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorStatus = error.status || error.statusCode;

  // Status codes comuns para rate limit/timeout
  if (errorStatus === 429 || errorStatus === 408 || errorStatus === 503) {
    return true;
  }

  // Mensagens comuns
  const timeoutKeywords = [
    'timeout',
    'rate limit',
    'quota',
    'too many requests',
    'service unavailable',
    'temporarily unavailable',
  ];

  return timeoutKeywords.some(keyword => errorMessage.includes(keyword));
}

