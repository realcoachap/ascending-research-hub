// Ascending Ask Theo API test server v0.5.2 — Theo 🧪 — 2026-06-01
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
const COMPOUND_MAP_PATH = process.env.THEO_COMPOUND_MAP || path.join(process.cwd(), 'knowledge', 'compound-map.json');
const MAX_KNOWLEDGE_CHUNKS = 5;
const MAX_COMPOUND_MATCHES = 4;
const PROVIDER_TIMEOUT_MS = Number(process.env.THEO_PROVIDER_TIMEOUT_MS || 8500);

const SYSTEM_PROMPT = `You are Theo, Ascending Research's source-aware research intelligence guide.
Ascending Research is completely separate from Ascending Aminos. It is not a store, not a sales funnel, and not a product recommendation layer.
Your job is to help users understand peptide, steroid, nutrient, vitamin, biomarker, pharmacology, COA, batch-verification, and research-literacy topics in plain English.
Personality:
- Start fresh: sound like a sharp research analyst, not a storefront assistant and not a scared disclaimer bot.
- Be direct, useful, evidence-literate, and calm. Explain what is known, what is only claimed, and what is unknown.
- Keep the existing research knowledge base, but treat it as source context, not sales copy.
Claim handling:
- You may discuss reported, anecdotal, creator/media, forum, label, literature, or study dosing/use claims when the user asks what people claim, what sources report, or how to evaluate a claim.
- Always label those as "reported claim," "anecdotal claim," "creator/media claim," "label context," or "study/literature context" based on source quality.
- Do not turn a reported claim into a recommendation, protocol, prescription, or instruction.
- Prefer this structure when claims are involved: claim summary, source/evidence tier, major uncertainty, risk/warning context, and what would need verification.
Public source naming:
- By default, do not foreground individual creator names, channel names, handles, video titles, or channel links from researcher-media/social/community sources.
- For those sources, use bucket language such as "creator-media claim," "community-reported claim," "unverified anecdotal claim," or "claim-discovery source."
- Exact creator/channel/link provenance should only appear when the user explicitly asks for provenance, exact citations, links, or "who said it."
Boundaries:
- Do not provide medical advice, diagnosis, prescriptions, treatment plans, or instructions to use any compound.
- Do not tell users what to take, how much to take, when to take it, or how to run a protocol.
- You may discuss dosing only as general educational context from research references, labels, literature, or explicitly framed reported/user claims. If you mention any dose/range/unit/frequency, clearly state it is not a recommendation, prescription, or instruction to use.
- Never invent citations or reference numbers. If sources are not provided, say “research references may mention” instead of citing fake studies.
- Never invent journal names, publication venues, authors, dates, or source labels. If the provided source context does not include that metadata, say "a PubMed-indexed source" or "a research source" instead.
- Avoid body-weight conversion examples, route instructions, injection instructions, how-to protocol steps, cycle design, or personalized examples.
- If a user asks about a compound followed by a number, such as “NAD+ 1000,” treat it as a product/label education question unless they explicitly ask what to take or how to use it. Explain what the compound is and what the number may indicate on a label, without giving use instructions.
- If a user asks about a compound name, code name, peptide, supplement, or research molecule without asking for use instructions, answer with an educational profile instead of stopping at a disclaimer. Cover: what it is, why researchers discuss it, major uncertainty/evidence caveat, and what label/COA details to verify.
- If a user asks for personalized dosing, use guidance, a protocol/cycle/stack, injection instructions, or what they/someone should take, do not provide a dose. Explain the boundary and suggest a qualified healthcare professional.
- For compound literacy questions, do not end with generic "consult a healthcare professional" boilerplate unless the user asked about real-world use, medical decisions, dosing, contraindications, or personal health context. A short research-only boundary is enough.
- Keep answers concise, warm, direct, and useful.
- You can respond in English, Spanish, Portuguese, French, Italian, German, and other major languages when requested. If asked what languages you speak, say you can explain research education topics in multiple languages and that the user can switch languages anytime.
- Do not mention language support unless the user asks about language.
- When a response language is requested, answer in that language while keeping safety boundaries clear.
- When source context is provided, synthesize it and mention the source class/tier in plain English. Do not overstate social media or creator-media claims as proven research.
- For peptide COA/purity questions, do not call 95% purity "good" or "premium." Explain that 95% can be a lower/minimum research-grade specification for some catalog peptides, 98%+ is high-purity, and Ascending's preferred premium standard should be >=99% HPLC purity plus identity confirmation by MS or LC-MS and a batch-specific COA. For MOTS-c, prefer >=99% if the user asks what standard Ascending should use.
- Prefer research-only wording and clear disclaimers without sounding scary.`;

function requestedLanguage(payload) {
  const raw = String(payload.language || '').toLowerCase().trim();
  const allowed = { en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', it: 'Italian', de: 'German' };
  return allowed[raw] ? { code: raw, name: allowed[raw] } : { code: 'en', name: 'English' };
}

function languageInstruction(language) {
  return `\n\nResponse language: ${language.name}. Answer naturally in ${language.name}. Do not mention language support unless the user asks about languages.`;
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

async function fetchWithTimeout(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
  return String(text || '').toLowerCase().match(/[a-z0-9+\-α]{3,}/g) || [];
}

const STOPWORDS = new Set([
  'about', 'after', 'also', 'and', 'are', 'can', 'for', 'from', 'how', 'into', 'more', 'not', 'tell', 'that', 'the', 'this', 'what', 'when', 'with', 'you', 'your',
  'claim', 'claims', 'claimed', 'claiming', 'common', 'dose', 'doses', 'dosing', 'dosage', 'explain', 'people', 'pubmed', 'reported', 'reportedly', 'reports', 'say', 'says', 'source', 'sources', 'typical', 'use', 'used', 'users',
]);

function normalizedSearchText(text) {
  return String(text || '').toLowerCase().replace(/α/g, 'alpha').replace(/[^a-z0-9+]+/g, '');
}

function loadCompoundMap() {
  try {
    if (!fs.existsSync(COMPOUND_MAP_PATH)) return [];
    const map = JSON.parse(fs.readFileSync(COMPOUND_MAP_PATH, 'utf8'));
    return (map.categories || []).flatMap(category => (category.items || []).map(item => ({
      ...item,
      category: category.name,
      categoryDescription: category.description,
    })));
  } catch (error) {
    console.warn('[ask-theo] failed to load compound map:', error.message);
    return [];
  }
}

function retrieveCompounds(message) {
  const normalizedMessage = normalizedSearchText(message);
  const messageTokens = new Set(tokens(message).map(normalizedSearchText).filter(Boolean));
  if (!normalizedMessage && !messageTokens.size) return [];
  return loadCompoundMap()
    .map(item => {
      const names = [item.name, ...(item.aliases || [])].filter(Boolean);
      const nameHit = names.some(name => {
        const normalizedName = normalizedSearchText(name);
        return normalizedName && normalizedMessage.includes(normalizedName);
      });
      const themeHits = [...tokens(`${item.type || ''} ${(item.themes || []).join(' ')}`)]
        .map(normalizedSearchText)
        .filter(token => token && messageTokens.has(token)).length;
      return { ...item, score: (nameHit ? 10 : 0) + themeHits };
    })
    .filter(item => item.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COMPOUND_MATCHES);
}

function retrieveKnowledge(message) {
  const queryTokens = new Set(tokens(message));
  for (const word of STOPWORDS) queryTokens.delete(word);
  if (!queryTokens.size) return [];
  return loadKnowledgeChunks()
    .map(chunk => {
      const chunkTokens = tokens(`${chunk.title} ${chunk.topic || ''} ${chunk.content}`);
      let score = 0;
      for (const token of chunkTokens) if (queryTokens.has(token)) score += 1;
      if (score > 0 && chunk.tier === 'peer_reviewed') score += 2;
      if (score > 0 && chunk.tier === 'clinical_reference') score += 1.5;
      if (score > 0 && chunk.tier === 'social_claim') score -= 0.5;
      return { ...chunk, score };
    })
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_KNOWLEDGE_CHUNKS);
}

function isBucketOnlySource(chunk) {
  const platform = String(chunk.platform || '').toLowerCase();
  return ['researcher_media', 'social_claim'].includes(chunk.tier)
    || /\b(youtube|rumble|x|twitter|reddit|instagram|tiktok|podcast|forum)\b/.test(platform);
}

function isProvenanceRequest(message) {
  return /\b(exact source|exact sources|source provenance|provenance|citation|citations|cite|links?|urls?|who said|which creator|which channel|channel name|creator name|show me the source|show sources)\b/i.test(message);
}

function sourceBucketInfo(chunk) {
  if (chunk.tier === 'peer_reviewed') {
    return { publicLabel: chunk.title || 'Clinical literature', sourceClass: 'Clinical literature', evidenceLevel: 'Peer-reviewed', sourceUse: 'Research context' };
  }
  if (chunk.tier === 'clinical_reference') {
    return { publicLabel: chunk.title || 'Clinical/reference source', sourceClass: 'Clinical/reference source', evidenceLevel: 'Reference material', sourceUse: 'Quality or label context' };
  }
  if (chunk.tier === 'product_label') {
    return { publicLabel: chunk.title || 'Product label / COA source', sourceClass: 'Product label / COA source', evidenceLevel: 'Label or batch document', sourceUse: 'Verification context' };
  }
  if (chunk.tier === 'social_claim') {
    return { publicLabel: 'Community-reported claim', sourceClass: 'Community-reported claim', evidenceLevel: 'Unverified anecdotal', sourceUse: 'Claim discovery, not proof' };
  }
  if (chunk.tier === 'researcher_media' || isBucketOnlySource(chunk)) {
    return { publicLabel: 'Creator-media claim', sourceClass: 'Creator-media claim', evidenceLevel: 'Anecdotal / needs verification', sourceUse: 'Claim discovery, not proof' };
  }
  return { publicLabel: chunk.title || 'Curated source', sourceClass: 'Curated source', evidenceLevel: String(chunk.tier || 'source').replace(/_/g, ' '), sourceUse: chunk.platform || 'Source context' };
}

function redactPublicProvenanceText(value) {
  return String(value || '')
    .replace(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|rumble\.com|x\.com|twitter\.com|reddit\.com|instagram\.com|tiktok\.com)\/[^\s)]+/gi, '[creator-media link hidden by default]')
    .replace(/\b(?:Nick\s+Trigili|The\s+Biohacking\s+Specialist|Biohacking\s*&\s*Performance\s+Specialist|Vigorous\s*Steve|VigorousSteve)\b/gi, 'a creator-media source')
    .replace(/@(?:TheBiohackingspecialist|thebiohackingspecialist|VigorousSteve|vigoroussteve)\b/gi, '@creator-media-source')
    .replace(/\bChannel URL:\s*\[creator-media link hidden by default\]/gi, 'Channel URL: hidden by default')
    .replace(/\bCanonical channel URL:\s*\[creator-media link hidden by default\]/gi, 'Canonical channel URL: hidden by default')
    .replace(/\bFeed URL:\s*\[creator-media link hidden by default\]/gi, 'Feed URL: hidden by default');
}

function sourceContext(chunks, options = {}) {
  if (!chunks.length) return '';
  const allowProvenance = Boolean(options.allowProvenance);
  const blocks = chunks.map((chunk, index) => {
    const bucket = sourceBucketInfo(chunk);
    if (isBucketOnlySource(chunk) && !allowProvenance) {
      return `[Source ${index + 1}: ${bucket.publicLabel} | tier=${chunk.tier} | source_class=${bucket.sourceClass} | evidence=${bucket.evidenceLevel} | public_provenance=hidden_by_default]\n${redactPublicProvenanceText(chunk.content)}`;
    }
    return `[Source ${index + 1}: ${chunk.title} | tier=${chunk.tier} | source_class=${bucket.sourceClass} | platform=${chunk.platform || 'unknown'} | url=${chunk.url}]\n${chunk.content}`;
  });
  return `\n\nUse the following curated source context when relevant. Distinguish peer-reviewed evidence from researcher/social/media claims, and do not invent citations beyond these sources. Unless the user explicitly asks for provenance, use source-bucket wording for creator-media/social/community sources instead of naming the creator, channel, handle, video title, or link.\n\n${blocks.join('\n\n')}`;
}

function compoundContext(compounds) {
  if (!compounds.length) return '';
  const blocks = compounds.map((item, index) => {
    const aliases = (item.aliases || []).length ? ` | aliases=${item.aliases.join(', ')}` : '';
    return `[Compound ${index + 1}: ${item.name}${aliases} | type=${item.type} | category=${item.category}]\nThemes: ${(item.themes || []).join(', ')}\nEducation note: ${item.explain}`;
  });
  return `\n\nUse the following internal compound literacy map when relevant. This is not a citation source; it is a safe orientation layer. If no peer-reviewed source context is provided, say "research discussions commonly frame it as..." rather than pretending to cite a paper.\n\n${blocks.join('\n\n')}`;
}

function publicCompoundMap() {
  try {
    if (!fs.existsSync(COMPOUND_MAP_PATH)) return [];
    const map = JSON.parse(fs.readFileSync(COMPOUND_MAP_PATH, 'utf8'));
    return (map.categories || []).map(category => ({
      name: category.name,
      description: category.description,
      items: (category.items || []).map(({ name, aliases, type, themes }) => ({ name, aliases, type, themes })),
    }));
  } catch (error) {
    console.warn('[ask-theo] failed to load public compound map:', error.message);
    return [];
  }
}

function knowledgeStats() {
  const chunks = loadKnowledgeChunks();
  const sources = new Set(chunks.map(chunk => chunk.sourceId));
  return { chunks: chunks.length, sources: sources.size, compounds: loadCompoundMap().length };
}

function isDosingTopic(message) {
  return /\b(dose|dosing|dosage|how much|how many|cycle|protocol|stack|frequency|per day|daily|weekly|mcg|mg|iu)\b/i.test(message);
}

function isEducationalDosingContext(message) {
  return isDosingTopic(message)
    && /\b(education|educational|general|reference|references|research|literature|published|study|studies|label|labeling|common|typical|explain|meaning|units|context|claim|claims|claimed|reported|report|reports|anecdotal|people say|people claim|users say|users claim|creator|media|youtube|forum|forums)\b/i.test(message);
}

function isReportedClaimQuestion(message) {
  return /\b(what do people|what are people|people say|people claim|users say|users claim|reported|reportedly|claim|claims|claimed|anecdotal|creator|media|youtube|forum|forums|reddit|source says|sources say)\b/i.test(message)
    && !/\b(for me|my dose|my dosage|my weight|my goal|should i take|should we take|how much should i take|how much should we take|tell me how much to take|can i take|do i take)\b/i.test(message);
}

function isPersonalizedDosingOrUseQuestion(message) {
  if (/\b(what should i|what should we|what do i|what do we|how do i|how do we)\s+(verify|check|look for|read|interpret|understand|confirm)\b/i.test(message)
    && /\b(coa|certificate of analysis|label|batch|lot|purity|hplc|mass spec|lc-ms|ms|endotoxin)\b/i.test(message)) return false;
  // Source-review wording can contain "should I" without asking Theo for personal use guidance.
  // Coach surfaced this with "how should I treat his SLU-PP-332 content?"
  if (/\b(what should i|what should we|how should i|how should we)\s+(treat|evaluate|interpret|classify|frame|use|handle)\b/i.test(message)
    && /\b(source|sources|content|channel|video|videos|claim|claims|researcher|media|creator|youtube|transcript|transcripts)\b/i.test(message)) return false;
  if (isReportedClaimQuestion(message)) return false;
  return /\b(should i|should you|can i|can you|do i|for me|my dose|my dosage|my weight|my goal|someone take|person take|human take|what should|how much should|tell me how much|protocol|cycle|stack|inject|injection instructions|use it|take it)\b/i.test(message);
}

function isDosingRangeRequest(message) {
  return isEducationalDosingContext(message)
    && /\b(range|ranges|common|typical|reference|references|literature|published|study|studies|label|labeling|claim|claims|reported|anecdotal|people say|people claim|users say|users claim)\b/i.test(message);
}

function isProductLabelEducationQuestion(message) {
  const hasCompoundNumber = /\b[A-Za-z][A-Za-z0-9+\-]{1,24}(?:\s+|\+)(?:\d{2,5})\b/.test(message);
  const asksInfo = /\b(tell me more|what is|what's|explain|info|information|about|more about|learn|details)\b/i.test(message);
  return hasCompoundNumber && asksInfo && !isPersonalizedDosingOrUseQuestion(message);
}

function isPurityQuestion(message) {
  return /\b(purity|pure|hplc|coa|certificate of analysis|mass spec|lc-ms|ms|endotoxin|industry standard|standard|spec|quality)\b/i.test(message);
}

function productLabelEducationPrompt(message) {
  return `The user is asking a product/label education question, not asking for a protocol. Answer helpfully. Explain the compound in plain English, what a number on a label may generally indicate (for example strength, vial amount, serving amount, or catalog naming depending on the label), and what someone should verify on the label/COA. Do not invent molecular sequences, COA values, sources, purity percentages, or claims not provided by the user. Include a brief education-only warning, but do not stop at the warning. Do not provide personalized dosing, use instructions, injection instructions, protocol, cycle, or stack advice. User question: ${message}`;
}

function dosingBoundary() {
  return 'Boundary: I can map reported dosing/use claims, label context, or literature references as education, but I cannot turn them into your dose, a protocol, a prescription, or instructions to use any compound. Any real-world decision belongs with a qualified healthcare professional.';
}

function isDosingUnitQuestion(message) {
  return /\b(mcg|microgram|micrograms|mg|milligram|milligrams)\b/i.test(message)
    && /\b(mean|means|meaning|unit|units|explain|convert|conversion|context)\b/i.test(message);
}

function dosingUnitsAnswer() {
  return 'Educational dosing-unit context: **mcg** means microgram and **mg** means milligram. **1 mg = 1,000 mcg**. These are measurement units used on labels, calculators, and research references. Understanding the units is not the same as a recommendation to use a compound. This is educational information only — not medical advice, not a prescription, and not dosing guidance.';
}

function educationalDosingPrompt(message) {
  return `Answer this as general educational and claim-analysis context only. If the user asks what people claim, what creator-media/community sources report, or what sources mention, separate the answer into reported claim, evidence/source tier, uncertainty, and risk/warning context. Use source-bucket wording by default; do not name creator-media personalities, channels, handles, video titles, or links unless the user explicitly asks for exact provenance/citations. If you mention dosing ranges, units, or frequencies, frame them as reported claims, research-reference context, literature context, or label context — never instructions. Include a clear warning that it is not medical advice, not a prescription, and not a recommendation to use any compound. Do not personalize. Do not calculate examples for a body weight/person. Do not provide route instructions, injection instructions, how-to protocols, cycle designs, stack plans, or fake citations. If no sources are provided, do not invent claims; say you need a pasted source or specific claim to evaluate. User question: ${message}`;
}

function compoundEducationPrompt(message) {
  return `The user is asking about one or more compounds for educational literacy. Answer helpfully; do not stop at a disclaimer. Use this structure when natural: what it is, why researchers discuss it, evidence/uncertainty caveat, and what to verify on a label or COA. Keep the safety note brief and avoid repeating the same COA checklist for every compound. Do not end with generic healthcare-professional boilerplate unless the user asked about real-world use or personal health context. Do not provide personalized dosing, use instructions, injection instructions, protocol, cycle, or stack advice. User question: ${message}`;
}

function purityEducationPrompt(message) {
  return `The user is asking about peptide purity or COA quality standards. Answer directly and conservatively. Do not say 95% purity is "good" for premium MOTS-c-style peptides. Explain the distinction: 95% can exist as a lower/minimum research-grade catalog spec, 98%+ is high purity, and Ascending's premium target should be >=99% HPLC purity with MS or LC-MS identity confirmation, batch-specific COA, and ideally endotoxin/sterility context when relevant. Do not provide dosing, protocol, injection, or use advice. User question: ${message}`;
}

function sanitizeEducationalDosingReply(reply) {
  const unsafePattern = /\b(\d+(?:\.\d+)?\s*(?:mcg|mg)\s*\/\s*kg|body weight|administered\s+(?:subcutaneously|orally|intravenously|intramuscularly)|subcutaneous injection|intravenous injection|intramuscular injection|how to inject|daily protocol|cycle plan|stack plan)\b/i;
  if (!unsafePattern.test(reply)) return reply;
  return 'Claim-analysis boundary: I can discuss dosing references, label language, and user-reported claims, but I should not present route-specific, body-weight, cycle, injection, or protocol-style guidance as instructions. If you paste a study excerpt, product label, creator claim, or forum claim, I can classify it by evidence tier and explain the risk context. This is not medical advice, not a prescription, and not a recommendation or instruction to use any compound.';
}

function compoundFallback(compounds) {
  if (!compounds.length) return '';
  const lines = compounds.map(item => {
    const themes = (item.themes || []).slice(0, 3).join(', ');
    return `**${item.name}** is ${item.type}. ${item.explain} Main research themes: ${themes}.`;
  });
  return `${lines.join('\n\n')}\n\nCOA/label checks: match the name or alias, batch/lot, stated amount or concentration, purity/identity method such as HPLC or LC-MS where relevant, test date, and issuing lab. Research-only note: this is educational context, not medical advice, dosing guidance, or instructions to use.`;
}

function sanitizeCompoundEducationReply(reply, compounds) {
  if (!compounds.length) return reply;
  const stripped = String(reply || '')
    .replace(/\b(A|One|Another) study published in (?:the journal )?[A-Z][A-Za-z& ]+(?=\s+(found|reported|described|showed|suggested))/g, '$1 PubMed-indexed source')
    .split(/\n{2,}/)
    .filter(paragraph => !/\b(consult|talk to|speak with).{0,40}\b(healthcare|doctor|clinician|medical professional)\b/i.test(paragraph))
    .filter(paragraph => !/\b(consult|talk to|speak with).{0,30}\ba qualified professional\b/i.test(paragraph))
    .filter(paragraph => !/\b(before starting|supplement regimen|their use should be guided|use should not be attempted|their use should be limited|its use should be limited|use should be limited|not intended for human use|without proper medical guidance|proper guidance from a qualified)\b/i.test(paragraph))
    .filter(paragraph => !/^please keep in mind\b/i.test(paragraph))
    .filter(paragraph => !/^remember, both\b/i.test(paragraph))
    .filter(paragraph => !/\bproper handling and storage\b/i.test(paragraph))
    .join('\n\n')
    .trim();
  const finalText = stripped || compoundFallback(compounds);
  return /\b(research-only|educational|not medical advice|not dosing guidance)\b/i.test(finalText)
    ? finalText
    : `${finalText}\n\nResearch-only note: this is educational context, not medical advice, dosing guidance, or instructions to use.`;
}

function sanitizePurityReply(reply) {
  let text = String(reply || '');
  text = text.replace(/\b95%\s+(?:purity\s+)?(?:is|would be|can be|should be)\s+(?:good|great|excellent|ideal|premium|high[- ]quality)\b/gi, '95% purity is a lower/minimum research-grade specification');
  text = text.replace(/\b(?:good|great|excellent|ideal|premium|high[- ]quality)\s+(?:purity\s+)?(?:is\s+)?95%\b/gi, 'a lower/minimum research-grade specification is 95%');
  if (/\bMOTS-?c\b/i.test(text) && !/\b99%|>=99|≥99|greater than or equal to 99/i.test(text)) {
    text += '\n\nFor MOTS-c specifically, Ascending should treat >=99% HPLC purity plus MS/LC-MS identity confirmation and a batch-specific COA as the preferred premium standard.';
  }
  return text;
}

function sanitizePublicReply(reply, allowProvenance = false) {
  if (allowProvenance) return reply;
  return redactPublicProvenanceText(reply);
}

function responseSources(chunks, allowProvenance = false) {
  const seen = new Set();
  return chunks
    .filter(chunk => {
      const key = chunk.sourceId || `${chunk.title}|${chunk.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(chunk => {
      const bucket = sourceBucketInfo(chunk);
      if (isBucketOnlySource(chunk) && !allowProvenance) {
        return {
          id: chunk.id,
          title: bucket.publicLabel,
          url: '',
          tier: chunk.tier,
          platform: 'Source bucket',
          sourceClass: bucket.sourceClass,
          evidenceLevel: bucket.evidenceLevel,
          sourceUse: bucket.sourceUse,
          provenanceHidden: true,
        };
      }
      return {
        id: chunk.id,
        title: chunk.title,
        url: chunk.url,
        tier: chunk.tier,
        platform: chunk.platform,
        sourceClass: bucket.sourceClass,
        evidenceLevel: bucket.evidenceLevel,
        sourceUse: bucket.sourceUse,
        provenanceHidden: false,
      };
    });
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

  const apiResponse = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
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

  const apiResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.25,
      max_tokens: 900,
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

function localFallback(message, compounds = []) {
  if (compounds.length && !isDosingTopic(message)) return compoundFallback(compounds);
  const q = message.toLowerCase();
  if (/dose|dosing|dosage|how much|take|cycle|protocol/.test(q)) {
    if (isReportedClaimQuestion(message)) {
      return 'Claim-analysis lane: I can discuss what people or sources claim only as reported/anecdotal/source-tiered information. Paste the specific claim, source, or wording and I’ll break it into: what is being claimed, evidence tier, major risks/unknowns, and what would need verification. This is not medical advice, not a protocol, and not a recommendation to use.';
    }
    return isEducationalDosingContext(message)
      ? 'Educational dosing context: I can explain dosing ranges, units, or reported-use claims only as source-tiered context. This is not medical advice, not a prescription, and not an instruction or recommendation to use any compound.'
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

  const apiResponse = await fetchWithTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      temperature: 0.35,
      max_output_tokens: 900,
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

  const apiResponse = await fetchWithTimeout(`${OLLAMA_URL}/api/chat`, {
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
  if (request.method === 'GET' && request.url === '/health') return sendJson(response, 200, { ok: true, service: 'ask-theo', model: geminiKey() ? GEMINI_MODEL : (process.env.GROQ_API_KEY ? GROQ_MODEL : (process.env.OPENAI_API_KEY ? MODEL : OLLAMA_MODEL)), provider: geminiKey() ? 'gemini' : (process.env.GROQ_API_KEY ? 'groq' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama')), providerTimeoutMs: PROVIDER_TIMEOUT_MS, knowledge: knowledgeStats() });
  if (request.method === 'GET' && request.url === '/api/theo-compounds') return sendJson(response, 200, { ok: true, categories: publicCompoundMap() });
  if (request.method !== 'POST' || request.url !== '/api/ask-theo') return sendJson(response, 404, { error: 'Not found' });

  try {
    const payload = JSON.parse(await readBody(request) || '{}');
    const message = cleanMessage(payload.message);
    const history = Array.isArray(payload.history) ? payload.history : [];
    const language = requestedLanguage(payload);
    if (!message) return sendJson(response, 400, { error: 'Message is required' });
    const allowProvenance = isProvenanceRequest(message);
    if (isPersonalizedDosingOrUseQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingBoundary(), mode: 'safety-boundary', language: language.code });
    }
    if (isDosingUnitQuestion(message)) {
      return sendJson(response, 200, { ok: true, reply: dosingUnitsAnswer(), mode: 'education-static', language: language.code });
    }
    const retrieved = retrieveKnowledge(message);
    const compounds = retrieveCompounds(message);
    const context = `${compoundContext(compounds)}${sourceContext(retrieved, { allowProvenance })}`;
    const baseMessage = isProductLabelEducationQuestion(message) && !compounds.some(item => /\d/.test(item.name))
      ? productLabelEducationPrompt(message)
      : (isEducationalDosingContext(message) ? educationalDosingPrompt(message) : (isPurityQuestion(message) ? purityEducationPrompt(message) : (compounds.length ? compoundEducationPrompt(message) : message)));
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
    if (!result) result = { text: localFallback(message, compounds), mode: 'local-fallback' };
    if (isDosingRangeRequest(message)) {
      result.text = sanitizeEducationalDosingReply(result.text);
    }
    if (isPurityQuestion(message)) {
      result.text = sanitizePurityReply(result.text);
    }
    if (compounds.length && !isPersonalizedDosingOrUseQuestion(message)) {
      result.text = sanitizeCompoundEducationReply(result.text, compounds);
    }
    result.text = sanitizePublicReply(result.text, allowProvenance);
    return sendJson(response, 200, { ok: true, reply: result.text, mode: result.mode, language: language.code, compounds: compounds.map(({ name, type, category }) => ({ name, type, category })), sources: responseSources(retrieved, allowProvenance) });
  } catch (error) {
    console.error('[ask-theo]', error);
    return sendJson(response, 500, { error: 'Theo test endpoint failed', detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Ask Theo test server listening on http://127.0.0.1:${PORT}`);
  console.log(`Provider order: Gemini(${GEMINI_MODEL}) -> Groq(${GROQ_MODEL}) -> OpenAI(${MODEL}) -> Ollama(${OLLAMA_MODEL})`);
});
