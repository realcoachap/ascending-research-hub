// Ascending Ask Theo API test server v0.2.1 — Theokoles ☠️ — 2026-05-22
// WHY: Local/proxyable chat endpoint for testing Theo with a real model while keeping API keys off the static GitHub Pages frontend.

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_ITEMS = 12;

const SYSTEM_PROMPT = `You are Theo, Ascending Research's peptide education coach.
Your job is educational literacy only: explain terminology, research concepts, COA/batch verification, storage/handling basics, mechanism summaries, and how to think about research-use information in plain English.
Boundaries:
- Do not provide medical advice, diagnosis, prescriptions, treatment plans, or instructions to use any compound.
- Do not tell users what to take, how much to take, when to take it, or how to run a protocol.
- If dosing, dosage, cycle, protocol, side effects in a personal-use context, disease treatment, pregnancy, minors, emergencies, or contraindications come up, respond with a brief safety boundary and suggest discussing with a qualified healthcare professional.
- You may explain dosing language as general educational context, but never personalize it.
- Keep answers concise, warm, direct, and useful.
- Prefer research-only wording and clear disclaimers without sounding scary.`;

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOW_ORIGIN,
    'access-control-allow-methods': 'POST, OPTIONS, GET',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 16000) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function cleanMessage(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_CHARS);
}

function isDosingOrUseQuestion(message) {
  return /\b(dose|dosing|dosage|how much|how many|take|use it|inject|injection|cycle|protocol|stack|frequency|per day|daily|weekly|mcg|mg|iu|bpc|tb-500|semaglutide|tirzepatide)\b/i.test(message)
    && /\b(should|can i|do i|someone|person|human|take|use|inject|dose|protocol|cycle|stack|how much|how many)\b/i.test(message);
}

function dosingBoundary() {
  return 'Educational boundary: I can’t provide dosing, protocol, injection, cycle, stack, or “how much should someone take” guidance. That would need to be reviewed with a qualified healthcare professional. I can help explain terminology, research-only label language, COA checks, storage basics, or what dosing units like mg/mcg mean in general educational context — without recommending use.';
}

function localFallback(message) {
  const q = message.toLowerCase();
  if (/dose|dosing|dosage|how much|take|cycle|protocol/.test(q)) {
    return 'Educational boundary: dosing depends on individual context and should be reviewed with a licensed healthcare professional. I can explain what dosing language means in research references, but I can’t prescribe, personalize, or tell anyone what to take.';
  }
  if (/coa|certificate|batch|lot|verify|lab/.test(q)) {
    return 'COA basics: a COA is a certificate of analysis — the paper trail for identity, purity, batch/lot ID, test date, lab source, and methods such as HPLC or LC-MS. The key move is matching the COA details against the product label and batch information.';
  }
  if (/reconstitution|water|mix|bac/.test(q)) {
    return 'Reconstitution means adding a measured liquid volume to a dry research material so concentration math can be calculated. The safe lane here is arithmetic and terminology only — not human-use instructions or protocol advice.';
  }
  return 'I can help with education-first questions: terminology, mechanisms, COA literacy, storage basics, research-use wording, and calculator concepts. I’ll keep it informational only — no diagnosis, prescriptions, treatment claims, or instructions to use compounds.';
}

async function askOpenAI(message, history) {
  if (!process.env.OPENAI_API_KEY) return null;

  const input = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY_ITEMS).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: cleanMessage(item.content),
    })).filter(item => item.content),
    { role: 'user', content: message },
  ];

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      temperature: 0.35,
      max_output_tokens: 520,
    }),
  });

  if (!apiResponse.ok) {
    const detail = await apiResponse.text();
    throw new Error(`OpenAI ${apiResponse.status}: ${detail.slice(0, 300)}`);
  }

  const data = await apiResponse.json();
  const text = data.output_text || data.output?.flatMap(part => part.content || []).map(part => part.text || '').join('\n').trim();
  return { text: text || localFallback(message), mode: 'openai' };
}

async function askOllama(message, history) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY_ITEMS).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: cleanMessage(item.content),
    })).filter(item => item.content),
    { role: 'user', content: message },
  ];

  const apiResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.35,
        num_predict: 520,
      },
    }),
  });

  if (!apiResponse.ok) {
    const detail = await apiResponse.text();
    throw new Error(`Ollama ${apiResponse.status}: ${detail.slice(0, 300)}`);
  }

  const data = await apiResponse.json();
  const text = data.message?.content?.trim();
  return { text: text || localFallback(message), mode: 'ollama' };
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method === 'GET' && request.url === '/health') return sendJson(response, 200, { ok: true, service: 'ask-theo', model: process.env.OPENAI_API_KEY ? MODEL : OLLAMA_MODEL, provider: process.env.OPENAI_API_KEY ? 'openai' : 'ollama' });
  if (request.method !== 'POST' || request.url !== '/api/ask-theo') return sendJson(response, 404, { error: 'Not found' });

  try {
    const payload = JSON.parse(await readBody(request) || '{}');
    const message = cleanMessage(payload.message);
    const history = Array.isArray(payload.history) ? payload.history : [];
    if (!message) return sendJson(response, 400, { error: 'Message is required' });
    if (isDosingOrUseQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingBoundary(), mode: 'safety-boundary' });
    }
    let result = await askOpenAI(message, history);
    if (!result) {
      try {
        result = await askOllama(message, history);
      } catch (ollamaError) {
        console.warn('[ask-theo] Ollama unavailable, using local fallback:', ollamaError.message);
        result = { text: localFallback(message), mode: 'local-fallback' };
      }
    }
    return sendJson(response, 200, { ok: true, reply: result.text, mode: result.mode });
  } catch (error) {
    console.error('[ask-theo]', error);
    return sendJson(response, 500, { error: 'Theo test endpoint failed', detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Ask Theo test server listening on http://127.0.0.1:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? `OpenAI model: ${MODEL}` : `Ollama model: ${OLLAMA_MODEL} at ${OLLAMA_URL}`);
});
