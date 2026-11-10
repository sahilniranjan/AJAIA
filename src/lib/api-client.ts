import type { ApiError } from "./types";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Client-side fetch wrapper: throws with the server's friendly message on non-OK responses. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiRequestError(0, "NETWORK", "Network error. Check your connection and try again.");
  }
  if (response.status === 401 && typeof window !== "undefined") {
    // A full reload on expired sessions clears any client state from the previous user.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      body?.error.code ?? "INTERNAL",
      body?.error.message ?? "Something went wrong. Please try again.",
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
