/**
 * App-wide single source of truth for the Claude model ID.
 * Consolidated here so core modules (analysis, OCR, letters, etc.) can never
 * drift onto a retired model. VeriCite keeps its own VERICITE_MODEL.
 */
export const CLAUDE_MODEL = 'claude-opus-4-8';
