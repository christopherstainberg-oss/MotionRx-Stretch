/**
 * Keyboard → program character normalization.
 *
 * Mobile/OS keyboards emit smart quotes, en/em dashes, ellipsis, NBSP,
 * zero-width joiners, and composed Unicode that break exact-string match
 * against catalog keys, clinical regex, and search. These helpers fold
 * input to what the program expects without stripping legitimate letters.
 */

/** Control / bidi / zero-width characters that must never enter storage or match keys */
const DANGEROUS_INVISIBLE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/**
 * Fold OS/keyboard punctuation to ASCII equivalents used in catalogs & regex.
 * Does NOT strip accented letters (José, café stay intact for display).
 */
export function foldKeyboardPunctuation(input: string): string {
  return String(input ?? "")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // ‘ ’ ‚ ‛ ′ ‵
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // “ ” „ ‟ ″ ‶
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-") // hyphens/dashes/minus
    .replace(/\u2026/g, "...") // …
    .replace(/[\u00A0\u202F\u2007\u2008\u2009\u200A]/g, " ") // NBSP / thin spaces
    .replace(/\u2044/g, "/") // fraction slash
    .replace(/\u00D7/g, "x") // ×
    .replace(/[\u00B7\u2022\u2023\u2043]/g, "-"); // middot / bullets → hyphen for match
}

/** Strip invisible / control characters used in injection or spoofing */
export function stripDangerousInvisible(input: string): string {
  return String(input ?? "").replace(DANGEROUS_INVISIBLE, "");
}

/**
 * Normalize free-text for storage and display.
 * NFC + keyboard fold + strip invisible. Preserves letters (incl. diacritics),
 * digits, and common punctuation users type (apostrophe, hyphen, period).
 */
export function normalizeUserText(input: string, maxLen = 8000): string {
  let s = String(input ?? "");
  try {
    s = s.normalize("NFC");
  } catch {
    /* ignore invalid */
  }
  s = stripDangerousInvisible(s);
  s = foldKeyboardPunctuation(s);
  // Collapse runs of spaces/tabs but keep newlines for multi-line journal/story
  s = s.replace(/[^\S\n]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim().slice(0, Math.max(0, maxLen));
}

/**
 * Aggressive fold for MATCHING only (search, video keys, clinical token match).
 * Diacritics removed so "café" matches "cafe"; punctuation folded; lowercase.
 */
export function normalizeForMatch(input: string): string {
  let s = String(input ?? "");
  try {
    s = s.normalize("NFKD");
  } catch {
    /* ignore */
  }
  s = stripDangerousInvisible(s);
  s = foldKeyboardPunctuation(s);
  // Strip combining marks (accents) after NFKD
  s = s.replace(/[\u0300-\u036f]/g, "");
  s = s.toLowerCase();
  // Keep alphanumerics, spaces, and a few structural separators used in catalogs
  s = s.replace(/[^a-z0-9\s/+.-]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Safe single-line display name: keep apostrophes/hyphens (O'Brien, Mary-Jane),
 * strip HTML breakout characters only.
 */
export function sanitizePersonName(input: string, maxLen = 80): string {
  let s = normalizeUserText(input, maxLen * 2);
  s = s
    .replace(/[<>`\\]/g, "")
    .replace(/"/g, "")
    // Allow letters (incl. Latin-1+), digits, space, apostrophe, hyphen, period
    // Avoid \p{} so we stay compatible with older TS lib targets.
    .replace(/[^\w\s'.\-\u00C0-\u024F\u1E00-\u1EFF]/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  return s;
}

/**
 * Email: fold keyboard junk, lower-case, strip invisible. Does not invent validity.
 */
export function normalizeEmailInput(input: string): string {
  return normalizeUserText(input, 254)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[<>"'`\\]/g, "");
}

/**
 * Password: do NOT fold or strip user-chosen symbols beyond absolute controls.
 * Passwords may intentionally use smart quotes; only remove null/control/bidi.
 */
export function normalizePasswordInput(input: string, maxLen = 128): string {
  return stripDangerousInvisible(String(input ?? "")).slice(0, maxLen);
}

/**
 * Query / filter tokens for library search boxes (client or server).
 */
export function normalizeSearchQuery(input: string, maxLen = 120): string {
  return normalizeForMatch(input).slice(0, maxLen);
}
