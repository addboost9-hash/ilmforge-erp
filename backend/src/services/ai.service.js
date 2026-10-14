/**
 * Ask an AI model for a JSON answer, with whichever key the school's server
 * has: Claude (ANTHROPIC_API_KEY) or Gemini (GEMINI_API_KEY, free from
 * Google AI Studio). Used for suggesting exam questions.
 *
 *   askJSON({ system, prompt, schema }) -> parsed object
 *
 * Throws an error with .status (503 when no key is set) and a message a
 * person can act on.
 */
const ANTHROPIC_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
const GEMINI_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
const TIMEOUT_MS = 90_000;

const fail = (msg, status) => { const e = new Error(msg); e.status = status; return e; };

function provider() {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}

async function post(url, headers, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[ai]', r.status, json?.error?.message || '');
      if (r.status === 401 || r.status === 403) throw fail('The AI key on the server was refused. Check ANTHROPIC_API_KEY / GEMINI_API_KEY.', 502);
      if (r.status === 429) throw fail('The AI service is busy. Wait a minute and try again.', 503);
      throw fail('The AI service could not answer just now. Try again.', 502);
    }
    return json;
  } catch (e) {
    if (e.name === 'AbortError') throw fail('The AI service took too long. Try fewer questions.', 504);
    if (e.status) throw e;
    throw fail('The AI service could not be reached. Check the internet connection.', 502);
  } finally {
    clearTimeout(timer);
  }
}

async function askJSON({ system, prompt, schema }) {
  const which = provider();
  if (!which) {
    throw fail('AI suggestions are not switched on: the server needs an AI key (GEMINI_API_KEY, free from Google AI Studio, or ANTHROPIC_API_KEY).', 503);
  }
  if (which === 'claude') {
    const json = await post(`${ANTHROPIC_URL}/v1/messages`, {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    }, {
      model: process.env.AI_MODEL || process.env.FORM_READER_MODEL || 'claude-opus-5-5',
      max_tokens: 8000,
      system,
      tools: [{ name: 'answer', description: 'The answer.', input_schema: schema }],
      tool_choice: { type: 'tool', name: 'answer' },
      messages: [{ role: 'user', content: prompt }],
    });
    const use = (json.content || []).find((c) => c.type === 'tool_use');
    if (!use) throw fail('The AI service gave no answer. Try again.', 502);
    return use.input || {};
  }
  const model = process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const json = await post(`${GEMINI_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {}, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nAnswer with one JSON object matching this JSON schema:\n${JSON.stringify(schema)}` }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  });
  const out = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try { return JSON.parse(out.replace(/^```(json)?|```$/g, '').trim()); } catch { throw fail('The AI answer could not be read. Try again.', 502); }
}

module.exports = { askJSON, provider };
