export function expandSkuRange(part: string): string[] {
  const trimmed = part.trim();
  if (!trimmed) return [];
  const m = trimmed.match(/^(.*?)(\d+)-(.*?)(\d+)$/);
  if (m && m[1] === m[3]) {
    const prefix = m[1];
    const start = parseInt(m[2], 10);
    const end = parseInt(m[4], 10);
    const pad = m[2].length;
    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end >= start &&
      end - start <= 200
    ) {
      const out: string[] = [];
      for (let i = start; i <= end; i++) {
        out.push(`${prefix}${String(i).padStart(pad, "0")}`);
      }
      return out;
    }
  }
  return [trimmed];
}

export function parseSkuList(input: string | null | undefined): string[] {
  if (!input) return [];
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of parts) {
    for (const sku of expandSkuRange(p)) {
      if (sku && !seen.has(sku)) {
        seen.add(sku);
        result.push(sku);
      }
    }
  }
  return result;
}
