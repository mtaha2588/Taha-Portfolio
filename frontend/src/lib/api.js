/**
 * Small wrapper around fetch() for talking to the FastAPI backend.
 *
 * The backend URL comes from the VITE_API_URL environment variable:
 *  - local development: falls back to http://localhost:8000
 *  - production (Vercel): set VITE_API_URL in the Vercel dashboard,
 *    e.g. https://your-backend.onrender.com
 *
 * Only public values belong in VITE_* variables: they are bundled
 * into the JavaScript that every visitor downloads.
 */
const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

export const API_URL = envUrl || (import.meta.env.DEV ? "http://localhost:8000" : "");
export const isApiConfigured = Boolean(API_URL);

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Converts FastAPI / Pydantic 422 errors into { fieldName: message }. */
function parseFieldErrors(detail) {
  const errors = {};
  if (!Array.isArray(detail)) return errors;
  for (const item of detail) {
    const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
    if (field && !errors[field]) {
      errors[field] = String(item.msg || "Invalid value").replace(/^Value error, /, "");
    }
  }
  return errors;
}

export async function apiRequest(path, { method = "GET", body, timeoutMs = 15000, signal } = {}) {
  if (!isApiConfigured) {
    // Visitors see a friendly message; the technical reason goes to the console for you.
    console.warn("[portfolio] VITE_API_URL is not set for this build, so API requests are disabled.");
    throw new ApiError("This service isn't available right now. Please try again later.", { status: 0 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const timedOut = err?.name === "AbortError";
    throw new ApiError(
      timedOut
        ? "The server took too long to respond. Please try again."
        : "Could not reach the server. Please check your connection and try again.",
      { status: 0 },
    );
  } finally {
    clearTimeout(timer);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const fieldErrors = parseFieldErrors(data?.detail);
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : Object.keys(fieldErrors).length
          ? "Please correct the highlighted fields."
          : `Request failed (${response.status}).`;
    throw new ApiError(message, { status: response.status, fieldErrors });
  }

  return data;
}
