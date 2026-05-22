// Ascending Ask Theo API test server v0.4.1 — Theo 🧪 — 2026-05-22
// WHY: Local/proxyable chat endpoint for testing Theo with a real model while keeping API keys off the static GitHub Pages frontend.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_ITEMS = 12;
const KNOWLEDGE_CHUNKS_PATH = process.env.THEO_KNOWLEDGE_CHUNKS || path.join(process.cwd(), 'knowledge', 'theo-chunks.jsonl');
const MAX_KNOWLEDGE_CHUNKS = 5;

const SYSTEM_PROMPT = `You are Theo, Ascending Research's peptide education coach.
Your job is educational literacy only: explain terminology, research concepts, COA/batch verification, storage/handling basics, mechanism summaries, and how to think about research-use information in plain English.
Boundaries:
- Do not provide medical advice, diagnosis, prescriptions, treatment plans, or instructions to use any compound.
- Do not tell users what to take, how much to take, when to take it, or how to run a protocol.
- You may discuss dosing only as general educational context from research references, labels, or literature. If you mention any dose/range/unit/frequency, clearly state it is not a recommendation, prescription, or instruction to use.
- Never invent citations or reference numbers. If sources are not provided, say “research references may mention” instead of citing fake studies.
- Avoid body-weight conversion examples, route instructions, injection instructions, protocols, cycles, or personalized examples.
- If a user asks about a compound followed by a number, such as “NAD+ 1000,” treat it as a product/label education question unless they explicitly ask what to take or how to use it. Explain what the compound is and what the number may indicate on a label, without giving use instructions.
- If a user asks for personalized dosing, use guidance, a protocol/cycle/stack, injection instructions, or what they/someone should take, do not provide a dose. Explain the boundary and suggest a qualified healthcare professional.
- Keep answers concise, warm, direct, and useful.
- You can respond in English, Spanish, Portuguese, French, Italian, German, and other major languages when requested. If asked what languages you speak, say you can explain research education topics in multiple languages and that the user can switch languages anytime.
- When a response language is requested, answer in that language while keeping safety boundaries clear.
- When source context is provided, synthesize it and mention the source title/tier in plain English. Do not overstate social media claims as proven research.
- Prefer research-only wording and clear disclaimers without sounding scary.`;

function requestedLanguage(payload) {
  const raw = String(payload.language || '').toLowerCase().trim();
  const allowed = { en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', it: 'Italian', de: 'German' };
  return allowed[raw] ? { code: raw, name: allowed[raw] } : { code: 'en', name: 'English' };
}

function languageInstruction(language) {
  return `\n\nResponse language: ${language.name}. Answer naturally in ${language.name}. If the user asks about languages, say Theo can explain research education topics in multiple languages and the chat language can be switched anytime.`;
}

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


function loadKnowledgeChunks() {
  try {
    if (!fs.existsSync(KNOWLEDGE_CHUNKS_PATH)) return [];
    return fs.readFileSync(KNOWLEDGE_CHUNKS_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .filter(row => row.content && row.title && row.tier);
  } catch (error) {
    console.warn('[ask-theo] failed to load knowledge chunks:', error.message);
    return [];
  }
}

function tokens(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9+\-]{3,}/g) || [];
}

function retrieveKnowledge(message) {
  const queryTokens = new Set(tokens(message));
  if (!queryTokens.size) return [];
  return loadKnowledgeChunks()
    .map(chunk => {
      const chunkTokens = tokens(`${chunk.title} ${chunk.topic || ''} ${chunk.content}`);
      let score = 0;
      for (const token of chunkTokens) if (queryTokens.has(token)) score += 1;
      if (chunk.tier === 'peer_reviewed') score += 2;
      if (chunk.tier === 'clinical_reference') score += 1.5;
      if (chunk.tier === 'social_claim') score -= 0.5;
      return { ...chunk, score };
    })
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_KNOWLEDGE_CHUNKS);
}

function sourceContext(chunks) {
  if (!chunks.length) return '';
  const blocks = chunks.map((chunk, index) => `[Source ${index + 1}: ${chunk.title} | tier=${chunk.tier} | platform=${chunk.platform || 'unknown'} | url=${chunk.url}]\n${chunk.content}`);
  return `\n\nUse the following curated source context when relevant. Distinguish peer-reviewed evidence from researcher/social/media claims, and do not invent citations beyond these sources.\n\n${blocks.join('\n\n')}`;
}

function knowledgeStats() {
  const chunks = loadKnowledgeChunks();
  const sources = new Set(chunks.map(chunk => chunk.sourceId));
  return { chunks: chunks.length, sources: sources.size };
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

function isProductLabelEducationQuestion(message) {
  const hasCompoundNumber = /\b[A-Za-z][A-Za-z0-9+\-]{1,24}\s*\+?\s*(?:\d{2,5})\b/.test(message);
  const asksInfo = /\b(tell me more|what is|what's|explain|info|information|about|more about|learn|details)\b/i.test(message);
  return hasCompoundNumber && asksInfo && !isPersonalizedDosingOrUseQuestion(message);
}

function productLabelEducationPrompt(message) {
  return `The user is asking a product/label education question, not asking for a protocol. Answer helpfully. Explain the compound in plain English, what a number on a label may generally indicate (for example strength, vial amount, serving amount, or catalog naming depending on the label), and what someone should verify on the label/COA. Do not invent molecular sequences, COA values, sources, purity percentages, or claims not provided by the user. Include a brief education-only warning, but do not stop at the warning. Do not provide personalized dosing, use instructions, injection instructions, protocol, cycle, or stack advice. User question: ${message}`;
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
  if (process.env.DISABLE_GEMINI === '1') return '';
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
  if (request.method === 'GET' && request.url === '/health') return sendJson(response, 200, { ok: true, service: 'ask-theo', model: geminiKey() ? GEMINI_MODEL : (process.env.GROQ_API_KEY ? GROQ_MODEL : (process.env.OPENAI_API_KEY ? MODEL : OLLAMA_MODEL)), provider: geminiKey() ? 'gemini' : (process.env.GROQ_API_KEY ? 'groq' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama')), knowledge: knowledgeStats() });
  if (request.method !== 'POST' || request.url !== '/api/ask-theo') return sendJson(response, 404, { error: 'Not found' });

  try {
    const payload = JSON.parse(await readBody(request) || '{}');
    const message = cleanMessage(payload.message);
    const history = Array.isArray(payload.history) ? payload.history : [];
    const language = requestedLanguage(payload);
    if (!message) return sendJson(response, 400, { error: 'Message is required' });
    if (isPersonalizedDosingOrUseQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingBoundary(), mode: 'safety-boundary', language: language.code });
    }
    if (isDosingUnitQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingUnitsAnswer(), mode: 'education-static', language: language.code });
    }
    const retrieved = retrieveKnowledge(message);
    const context = sourceContext(retrieved);
    const baseMessage = isProductLabelEducationQuestion(message)
      ? productLabelEducationPrompt(message)
      : (isEducationalDosingContext(message) ? educationalDosingPrompt(message) : message);
    const modelMessage = `${baseMessage}${context}${languageInstruction(language)}`;
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
    return sendJson(response, 200, { ok: true, reply: result.text, mode: result.mode, language: language.code, sources: retrieved.map(({ id, title, url, tier, platform }) => ({ id, title, url, tier, platform })) });
  } catch (error) {
    console.error('[ask-theo]', error);
    return sendJson(response, 500, { error: 'Theo test endpoint failed', detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Ask Theo test server listening on http://127.0.0.1:${PORT}`);
  console.log(`Provider order: Gemini(${GEMINI_MODEL}) -> Groq(${GROQ_MODEL}) -> OpenAI(${MODEL}) -> Ollama(${OLLAMA_MODEL})`);
});
