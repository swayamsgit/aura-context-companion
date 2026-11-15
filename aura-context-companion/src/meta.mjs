export const META_BASE_URL = 'https://api.meta.ai/v1';
export class ProviderError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
// Key stays on the server. Caller must separately enforce consent and usage limits.
export async function metaCompletion({messages, key, model = 'muse-spark-1.3', fetchImpl = fetch}) {
  if (!key) throw new ProviderError('Meta API key is not configured.', 503);
  let response;
  try {
    response = await fetchImpl(`${META_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model, messages, max_completion_tokens: 1200}),
      signal: AbortSignal.timeout(30000)
    });
  } catch { throw new ProviderError('Meta did not respond. Your notes are unchanged.'); }
  if (!response.ok) {
    // Never relay the provider body, which may contain private input or diagnostics.
    if (response.status === 401 || response.status === 403) throw new ProviderError('Meta authentication or access was rejected.', 503);
    if (response.status === 429) throw new ProviderError('Meta usage limit reached. Try later.', 429);
    throw new ProviderError('Meta could not complete this request. Your notes are unchanged.');
  }
  let data;
  try { data = await response.json(); } catch { throw new ProviderError('Meta returned an unreadable response.'); }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new ProviderError('Meta returned no usable text.');
  return {text: content.trim(), model: data.model || model, usage: data.usage || null};
}

