// Ascending Ask Theo API test server v0.3.4 — Theokoles ☠️ — 2026-05-22
// WHY: Local/proxyable chat endpoint for testing Theo with a real model while keeping API keys off the static GitHub Pages frontend.

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
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
- You may discuss dosing only as general educational context from research references, labels, or literature. If you mention any dose/range/unit/frequency, clearly state it is not a recommendation, prescription, or instruction to use.
- Never invent citations or reference numbers. If sources are not provided, say “research references may mention” instead of citing fake studies.
- Avoid body-weight conversion examples, route instructions, injection instructions, protocols, cycles, or personalized examples.
- If a user asks for personalized dosing, use guidance, a protocol/cycle/stack, injection instructions, or what they/someone should take, do not provide a dose. Explain the boundary and suggest a qualified healthcare professional.
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

function isDosingTopic(message) {
  return /\b(dose|dosing|dosage|how much|how many|cycle|protocol|stack|frequency|per day|daily|weekly|mcg|mg|iu)\b/i.test(message);
}

function isEducationalDosingContext(message) {
  return isDosingTopic(message)
    && /\b(education|educational|general|reference|references|research|literature|published|study|studies|label|labeling|common|typical|explain|meaning|units|context)\b/i.test(message);
}

function isPersonalizedDosingOrUseQuestion(message) {
  return /\b(should i|should you|can i|can you|do i|for me|my dose|my dosage|my weight|my goal|someone take|person take|human take|what should|how much should|tell me how much|protocol|cycle|stack|inject|injection instructions|use it|take it)\b/i.test(message);
}

function isDosingRangeRequest(message) {
  return isEducationalDosingContext(message)
    && /\b(range|ranges|common|typical|reference|references|literature|published|study|studies|label|labeling)\b/i.test(message);
}

function dosingBoundary() {
  return 'Educational boundary: I can discuss dosing only as general educational context from research references or labeling — not as a recommendation, prescription, protocol, or instruction to use any compound. I can’t tell you, or anyone, what to take or how to use it. A qualified healthcare professional should review any real-world dosing decision.';
}

function isDosingUnitQuestion(message) {
  return /\b(mcg|microgram|micrograms|mg|milligram|milligrams)\b/i.test(message)
    && /\b(mean|means|meaning|unit|units|explain|convert|conversion|context)\b/i.test(message);
}

function dosingUnitsAnswer() {
  return 'Educational dosing-unit context: **mcg** means microgram and **mg** means milligram. **1 mg = 1,000 mcg**. These are measurement units used on labels, calculators, and research references. Understanding the units is not the same as a recommendation to use a compound. This is educational information only — not medical advice, not a prescription, and not dosing guidance.';
}

function educationalDosingPrompt(message) {
  return `Answer this as general educational context only. If you mention dosing ranges, units, or frequencies, frame them as examples from research references/literature or labeling, not instructions. Include a clear warning that it is not medical advice, not a prescription, and not a recommendation to use any compound. Do not personalize. Do not calculate examples for a body weight/person. Do not provide route instructions, injection instructions, protocols, cycles, stacks, or fake citations. If no sources are provided, do not cite numbered references. User question: ${message}`;
}

function sanitizeEducationalDosingReply(reply) {
  const unsafePattern = /\b(mcg\s*\/\s*kg|mg\s*\/\s*kg|body weight|administered|subcutaneous|intravenous|intramuscular|injection|inject|orally|oral administration|twice daily|per day|daily protocol|cycle|stack)\b/i;
  if (!unsafePattern.test(reply)) return reply;
  return 'Educational dosing context: I can discuss dosing references, units, and label language, but I should not invent or present route-specific, body-weight, cycle, injection, or protocol-style guidance without a source. If you paste a study excerpt, product label, or reference range, I can help interpret what it means in plain English. This is not medical advice, not a prescription, and not a recommendation or instruction to use any compound.';
}

function geminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

async function askGemini(message, history) {
  const key = geminiKey();
  if (!key) return null;

  const contents = [
    ...history.slice(-MAX_HISTORY_ITEMS).map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: cleanMessage(item.content) }],
    })).filter(item => item.parts[0].text),
    { role: 'user', parts: [{ text: message }] },
  ];

  const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 520,
      },
    }),
  });

  if (!apiResponse.ok) {
    const detail = await apiResponse.text();
    throw new Error(`Gemini ${apiResponse.status}: ${detail.slice(0, 300)}`);
  }

  const data = await apiResponse.json();
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();
  return { text: text || localFallback(message), mode: 'gemini' };
}

async function askGroq(message, history) {
  if (!process.env.GROQ_API_KEY) return null;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY_ITEMS).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: cleanMessage(item.content),
    })).filter(item => item.content),
    { role: 'user', content: message },
  ];

  const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.25,
      max_tokens: 520,
    }),
  });

  if (!apiResponse.ok) {
    const detail = await apiResponse.text();
    throw new Error(`Groq ${apiResponse.status}: ${detail.slice(0, 300)}`);
  }

  const data = await apiResponse.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return { text: text || localFallback(message), mode: 'groq' };
}

function localFallback(message) {
  const q = message.toLowerCase();
  if (/dose|dosing|dosage|how much|take|cycle|protocol/.test(q)) {
    return isEducationalDosingContext(message)
      ? 'Educational dosing context: I can explain dosing ranges or units only as general research-reference information. This is not medical advice, not a prescription, and not an instruction or recommendation to use any compound.'
      : dosingBoundary();
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
  if (request.method === 'GET' && request.url === '/health') return sendJson(response, 200, { ok: true, service: 'ask-theo', model: geminiKey() ? GEMINI_MODEL : (process.env.GROQ_API_KEY ? GROQ_MODEL : (process.env.OPENAI_API_KEY ? MODEL : OLLAMA_MODEL)), provider: geminiKey() ? 'gemini' : (process.env.GROQ_API_KEY ? 'groq' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama')) });
  if (request.method !== 'POST' || request.url !== '/api/ask-theo') return sendJson(response, 404, { error: 'Not found' });

  try {
    const payload = JSON.parse(await readBody(request) || '{}');
    const message = cleanMessage(payload.message);
    const history = Array.isArray(payload.history) ? payload.history : [];
    if (!message) return sendJson(response, 400, { error: 'Message is required' });
    if (isPersonalizedDosingOrUseQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingBoundary(), mode: 'safety-boundary' });
    }
    if (isDosingUnitQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingUnitsAnswer(), mode: 'education-static' });
    }
    const modelMessage = isEducationalDosingContext(message) ? educationalDosingPrompt(message) : message;
    let result = null;
    for (const provider of [askGemini, askGroq, askOpenAI, askOllama]) {
      try {
        result = await provider(modelMessage, history);
        if (result) break;
      } catch (providerError) {
        console.warn('[ask-theo] provider failed, trying next:', providerError.message);
      }
    }
    if (!result) result = { text: localFallback(message), mode: 'local-fallback' };
    if (isDosingRangeRequest(message)) {
      result.text = sanitizeEducationalDosingReply(result.text);
    }
    return sendJson(response, 200, { ok: true, reply: result.text, mode: result.mode });
  } catch (error) {
    console.error('[ask-theo]', error);
    return sendJson(response, 500, { error: 'Theo test endpoint failed', detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Ask Theo test server listening on http://127.0.0.1:${PORT}`);
  console.log(`Provider order: Gemini(${GEMINI_MODEL}) -> Groq(${GROQ_MODEL}) -> OpenAI(${MODEL}) -> Ollama(${OLLAMA_MODEL})`);
});
