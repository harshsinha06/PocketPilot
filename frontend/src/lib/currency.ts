export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const MAX_PAISE = 1_000_000_000;

export function rupeesToPaise(input: string): number | null {
  const raw = input.trim().replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;

  const [whole, fraction = ""] = raw.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise > MAX_PAISE) return null;
  return paise;
}

export function paiseToInput(paise: number): string {
  const abs = Math.abs(Math.trunc(paise));
  const rupees = Math.trunc(abs / 100);
  const fraction = abs % 100;
  if (fraction === 0) return String(rupees);
  return `${rupees}.${String(fraction).padStart(2, "0")}`;
}

export function formatPaise(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const rupees = Math.trunc(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const formatted = new Intl.NumberFormat("en-IN").format(rupees);
  return `${negative ? "−" : ""}₹${formatted}.${fraction}`;
}

export function formatChangePaise(paise: number): string {
  if (paise > 0) return `+${formatPaise(paise)}`;
  return formatPaise(paise);
}

export function formatSignedPaise(type: "income" | "expense", paise: number): string {
  const formatted = formatPaise(Math.abs(paise));
  return type === "income" ? `+${formatted}` : `−${formatted}`;
}
