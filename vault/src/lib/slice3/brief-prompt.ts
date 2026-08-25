import 'server-only';

// Bump whenever SYSTEM_PROMPT_TEMPLATE below changes -- stored on every
// document_briefs row so a past brief's prompt version stays legible.
export const PROMPT_VERSION = 'brief-v1';

export const MODEL_ID = 'claude-opus-5';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  el: 'Greek',
};

export function languageName(clientLanguage: string): string {
  return LANGUAGE_NAMES[clientLanguage] ?? 'English';
}

// Verbatim per the project instructions, with only [LANGUAGE] substituted.
// Do not paraphrase or "improve" this -- the ABSOLUTE RULES section is
// what keeps a generated brief from implying certification or stating a
// figure that could drift from the source document.
export function buildSystemPrompt(language: string): string {
  return `You are summarising a technical document for the owner of a property
in Athens. Write in ${languageName(language)}. Maximum 120 words.
State: what type of document this is, what work or finding it
concerns, and which parts of the property are affected.
ABSOLUTE RULES:
- Never state any monetary amount, price, percentage or total. If the
  document contains figures, write "see the amount shown alongside".
- Never state or imply certification, ELOT compliance, engineering
  sign-off, or Technical Due Diligence by a certified engineer.
- Findings are diagnostic and observational only.
- Use: Asset Management, Asset Risk, CapEx, Technical Project
  Management, Technical Audit. Never: property management, repairs,
  problem, cost, due diligence.
- No em dashes.
- If the text is unclear or truncated, say so. Never fill a gap.`;
}
