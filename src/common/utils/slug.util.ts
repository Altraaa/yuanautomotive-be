import slugify from 'slugify';

const OPTS = { lower: true, strict: true, trim: true } as const;

export function toSlug(value: string): string {
  return slugify(value, OPTS);
}

/**
 * Produces a slug unique within a table by suffixing -2, -3, … when needed.
 * `exists` checks the DB for a candidate (excluding the row being updated).
 */
export async function uniqueSlug(
  source: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = toSlug(source) || 'item';
  let candidate = base;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}
