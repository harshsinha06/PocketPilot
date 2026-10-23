import { apiRequest } from "./api";
import type { InvestmentKind, InvestmentOverview } from "./types";

type OverviewResponse = {
  success: boolean;
  data: InvestmentOverview;
};

export const INVESTMENT_KINDS: InvestmentKind[] = [
  "Stocks",
  "Mutual Funds",
  "Gold",
  "Fixed Deposits",
  "US Stocks",
  "EPF",
  "NPS",
];

const INVESTMENT_SLUGS: Record<InvestmentKind, string> = {
  Stocks: "stocks",
  "Mutual Funds": "mutual-funds",
  Gold: "gold",
  "Fixed Deposits": "fixed-deposits",
  "US Stocks": "us-stocks",
  EPF: "epf",
  NPS: "nps",
};

export function investmentKindSlug(kind: InvestmentKind) {
  return INVESTMENT_SLUGS[kind];
}

export function investmentKindFromSlug(slug: string): InvestmentKind | null {
  const match = INVESTMENT_KINDS.find((kind) => INVESTMENT_SLUGS[kind] === slug);
  return match ?? null;
}

export async function getInvestments() {
  const body = await apiRequest<OverviewResponse>("/api/investments");
  return body.data;
}

export async function createHolding(input: { name: string; kind: InvestmentKind; invested: number; current: number }) {
  await apiRequest("/api/investments/holdings", { method: "POST", body: input });
}

export async function updateHolding(id: string, input: { name: string; kind: InvestmentKind; invested: number; current: number }) {
  await apiRequest(`/api/investments/holdings/${id}`, { method: "PUT", body: input });
}

export async function deleteHolding(id: string) {
  await apiRequest(`/api/investments/holdings/${id}`, { method: "DELETE" });
}

export async function createContribution(input: { name: string; kind: InvestmentKind; amount: number }) {
  await apiRequest("/api/investments/contributions", { method: "POST", body: input });
}

export async function deleteContribution(id: string) {
  await apiRequest(`/api/investments/contributions/${id}`, { method: "DELETE" });
}

export async function createSip(input: { name: string; kind: InvestmentKind; amount: number }) {
  await apiRequest("/api/investments/sips", { method: "POST", body: input });
}

export async function stopSip(id: string) {
  await apiRequest(`/api/investments/sips/${id}/stop`, { method: "POST" });
}
