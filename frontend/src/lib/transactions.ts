import { apiRequest } from "./api";
import type { Summary, Transaction, TransactionInput, TransactionList } from "./types";

type DataResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function listTransactions(params: {
  type?: string;
  category?: string;
  search?: string;
  month?: number;
  year?: number;
  sort?: string;
  page?: number;
}) {
  return apiRequest<DataResponse<TransactionList>>(
    `/api/transactions${query({ ...params, limit: 20 })}`
  );
}

export function createTransaction(input: TransactionInput) {
  return apiRequest<DataResponse<{ transaction: Transaction }>>("/api/transactions", {
    method: "POST",
    body: input,
  });
}

export function updateTransaction(id: string, input: TransactionInput) {
  return apiRequest<DataResponse<{ transaction: Transaction }>>(`/api/transactions/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteTransaction(id: string) {
  return apiRequest<DataResponse<undefined>>(`/api/transactions/${id}`, {
    method: "DELETE",
  });
}

export function getSummary() {
  return apiRequest<DataResponse<Summary>>("/api/summary");
}