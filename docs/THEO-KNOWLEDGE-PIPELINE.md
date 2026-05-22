# Theo Knowledge Pipeline

v0.1.0 — Theokoles ☠️ — 2026-05-22

WHY: Ask Theo needs a curated source brain for trusted researchers, social content, transcripts, labels, COAs, and peer-reviewed papers.

## Flow

1. Collect source URL + transcript/abstract/notes.
2. Classify source tier:
   - peer_reviewed
   - clinical_reference
   - researcher_media
   - product_label
   - social_claim
3. Ingest text into `knowledge/theo-chunks.jsonl` with `scripts/add-theo-source.mjs`.
4. Theo API retrieves relevant chunks per question.
5. Theo synthesizes and labels evidence quality instead of treating all sources equally.

## Current ingestion command

```bash
node scripts/add-theo-source.mjs \
  --title "Source title" \
  --url "https://example.com" \
  --platform "YouTube" \
  --tier researcher_media \
  --author "Researcher Name" \
  --topic "nad" \
  --text-file path/to/transcript.txt
```

## Social source rule

YouTube, Rumble, X, podcast clips, and influencer posts are useful, but Theo should treat them as **claims or interpretations** unless they cite verifiable papers, labels, or COAs.

## Paper source rule

PubMed/DOI papers are stronger, but Theo should still avoid converting study context into human-use instructions.
