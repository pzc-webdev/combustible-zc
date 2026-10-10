export function parseSpanishNumber(value: unknown): number {
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}
