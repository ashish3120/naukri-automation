/** Pure helpers for naukri-profile-refresh.js — no browser, so they're testable. */

/** Cycle the trailing dots: "" → "." → ".." → "" → ... Always differs from `current`. */
const nextHeadline = (current) => {
  const cur = String(current).trimEnd();
  const base = cur.replace(/\.+$/, '');
  const dots = cur.length - base.length;
  return base + '.'.repeat(dots >= 2 ? 0 : dots + 1);
};

/**
 * Naukri Campus profile summary: trailing dots are stripped by Naukri's
 * specialChar server-side validation, so they never stick.
 * Instead, cycle trailing Unicode en-spaces (U+2002): invisible to recruiters
 * and not matched by Naukri's special-char filter.
 * Cycles: "" → "\u2002" → "\u2002\u2002" → "" → ...
 */
const nextCampusSummary = (current) => {
  // Strip any trailing whitespace (including our cycling en-spaces and regular spaces)
  const cur = String(current).replace(/[\s\u2002]+$/, '');
  // Count existing trailing en-spaces before the trim
  const orig = String(current);
  const enSpaces = orig.length - orig.replace(/\u2002+$/, '').length;
  const next = enSpaces >= 2 ? 0 : enSpaces + 1;
  return cur + '\u2002'.repeat(next);
};

/**
 * True when the profile's resume was uploaded today.
 * Parses the date that directly follows "Uploaded on" instead of testing today's
 * date against the whole surrounding block — the block also carries the profile's
 * "last updated" date, which the hourly headline edit sets to today, so the old
 * check read "up-to-date" every run and the daily re-upload never fired.
 */
const uploadedToday = (text, now = new Date()) => {
  const m = /Uploaded on\s*:?\s*([A-Za-z]{3,9})\s+0?(\d{1,2}),?\s+(\d{4})/i.exec(String(text));
  if (!m) return false; // can't tell → re-upload and verify
  const d = new Date(`${m[1]} ${m[2]}, ${m[3]}`);
  return !isNaN(d) && d.toDateString() === now.toDateString();
};

module.exports = { nextHeadline, nextCampusSummary, uploadedToday };
