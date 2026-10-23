import type { FieldError } from "./types";

export class ApiClientError extends Error {
  status: number;
  errors?: FieldError[];

  constructor(message: string, status: number, errors?: FieldError[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
  }
}

type ErrorBody = {
  message?: string;
  errors?: FieldError[];
};

function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new ApiClientError("API URL is not configured.", 0);
  }
  return url.replace(/\/$/, "");
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers,
      body,
    });
  } catch {
    throw new ApiClientError(
      "Could not reach the server. Check that the API is running.",
      0
    );
  }

  const payload = (await response.json().catch(() => null)) as ErrorBody | null;

  if (!response.ok) {
    throw new ApiClientError(
      payload?.message || "Request failed",
      response.status,
      payload?.errors
    );
  }

  return payload as T;
}

export function fieldMessage(errors: FieldError[] | undefined, field: string) {
  return errors?.find((item) => item.field === field)?.message;
}
