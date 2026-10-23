export const MAX_PAISE = 1_000_000_000;

export function formatPaise(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const rupees = Math.trunc(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const formatted = new Intl.NumberFormat("en-IN").format(rupees);
  return `${negative ? "−" : ""}₹${formatted}.${fraction}`;
}

export function readPaise(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}
