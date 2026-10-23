import { apiRequest } from "./api";
import type { BudgetListItem, BudgetRecord, MonthReport } from "./types";

type DataResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type BudgetInput = {
  amount: number;
  categories: { category: string; amount: number }[];
  month?: number;
  year?: number;
};

function query(month?: number, year?: number): string {
  if (month === undefined || year === undefined) return "";
  return `?month=${month}&year=${year}`;
}

export function getMonthReport(month?: number, year?: number) {
  return apiRequest<DataResponse<MonthReport>>(`/api/insights${query(month, year)}`);
}

export function getCurrentBudget(month?: number, year?: number) {
  return apiRequest<DataResponse<MonthReport>>(`/api/budgets/current${query(month, year)}`);
}

export function listBudgets() {
  return apiRequest<DataResponse<{ budgets: BudgetListItem[] }>>("/api/budgets");
}

export function createBudget(input: BudgetInput) {
  return apiRequest<DataResponse<{ budget: BudgetRecord }>>("/api/budgets", {
    method: "POST",
    body: input,
  });
}

export function updateBudget(id: string, input: BudgetInput) {
  return apiRequest<DataResponse<{ budget: BudgetRecord }>>(`/api/budgets/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteBudget(id: string) {
  return apiRequest<DataResponse<undefined>>(`/api/budgets/${id}`, {
    method: "DELETE",
  });
}
