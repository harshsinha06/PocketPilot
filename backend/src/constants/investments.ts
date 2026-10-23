export const INVESTMENT_KINDS = [
  "Stocks",
  "Mutual Funds",
  "Gold",
  "Fixed Deposits",
  "US Stocks",
  "EPF",
  "NPS",
] as const;

export type InvestmentKind = (typeof INVESTMENT_KINDS)[number];

export function isInvestmentKind(value: string): value is InvestmentKind {
  return (INVESTMENT_KINDS as readonly string[]).includes(value);
}
