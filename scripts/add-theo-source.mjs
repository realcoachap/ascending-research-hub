#!/usr/bin/env node
// Theo source ingestion helper v0.1.0 — Theokoles ☠️ — 2026-05-22
// WHY: Adds trusted papers/transcripts/labels/social research notes into Theo's local retrieval chunks without needing a database yet.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const knowledgeDir = path.join(root, 'knowledge');
const sourcesPath = path.join(knowledgeDir, 'sources.json');
const chunksPath = path.join(knowledgeDir, 'theo-chunks.jsonl');
const allowedTiers = new Set(['peer_reviewed', 'clinical_reference', 'researcher_media', 'product_label', 'social_claim']);

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] || fallback) : fallback;
}

function usage() {
  console.log(`Usage:\n  node scripts/add-theo-source.mjs --title "Title" --url "https://..." --platform "YouTube|PubMed|X|Rumble" --tier peer_reviewed --text-file transcript.txt [--author "Name"] [--topic "nad"]`);
}

function chunkText(text, size = 1200, overlap = 160) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    const chunk = clean.slice(start, start + size).trim();
    if (chunk.length > 80) chunks.push(chunk);
  }
  return chunks;
}

const title = arg('title');
const url = arg('url');
const platform = arg('platform', 'unknown');
const tier = arg('tier', 'social_claim');
const author = arg('author');
const topic = arg('topic');
const textFile = arg('text-file');

if (!title || !url || !textFile || !allowedTiers.has(tier)) {
  usage();
  process.exit(1);
}

const textPath = path.resolve(root, textFile);
if (!fs.existsSync(textPath)) throw new Error(`Text file not found: ${textPath}`);

fs.mkdirSync(knowledgeDir, { recursive: true });
const registry = fs.existsSync(sourcesPath)
  ? JSON.parse(fs.readFileSync(sourcesPath, 'utf8'))
  : { version: '0.1.0', updated: new Date().toISOString().slice(0, 10), builder: 'Theokoles ☠️', sources: [] };

const sourceId = crypto.createHash('sha256').update(`${url}\n${title}`).digest('hex').slice(0, 16);
const source = {
  id: sourceId,
  title,
  url,
  platform,
  tier,
  author: author || null,
  topic: topic || null,
  added: new Date().toISOString(),
};

registry.sources = registry.sources.filter(item => item.id !== sourceId);
registry.sources.push(source);
registry.updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(sourcesPath, `${JSON.stringify(registry, null, 2)}\n`);

const existingLines = fs.existsSync(chunksPath) ? fs.readFileSync(chunksPath, 'utf8').split('\n').filter(Boolean) : [];
const filtered = existingLines.filter(line => {
  try { return JSON.parse(line).sourceId !== sourceId; } catch { return false; }
});
const chunks = chunkText(fs.readFileSync(textPath, 'utf8'));
const rows = chunks.map((content, index) => JSON.stringify({
  id: `${sourceId}-${index + 1}`,
  sourceId,
  title,
  url,
  platform,
  tier,
  author: author || null,
  topic: topic || null,
  chunkIndex: index + 1,
  content,
}));
fs.writeFileSync(chunksPath, `${filtered.concat(rows).join('\n')}\n`);
console.log(`Added ${chunks.length} chunks from ${title} (${sourceId})`);
