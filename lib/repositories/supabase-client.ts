/**
 * Shared Supabase PostgREST client helper (Wave 1 Slice D).
 *
 * All Supabase repository impls use this to build the PostgREST endpoint URL,
 * attach the service-role API key headers, and parse responses. Using the
 * service-role key bypasses RLS — these impls run server-side only (API routes
 * and server components), never in the browser.
 *
 * The client never throws on missing env vars — the factory only selects the
 * Supabase impl when `isLive("database")` is true, which checks that both
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present. So by the
 * time this code runs, the env vars are guaranteed to be set.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Base PostgREST endpoint, e.g. `https://xyz.supabase.co/rest/v1`. */
function restBaseUrl(): string {
  return `${SUPABASE_URL}/rest/v1`;
}

/** Headers for every PostgREST request — service-role key bypasses RLS. */
function restHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/** Single-object header — tells PostgREST to return one object, not an array. */
function singleObjectHeaders(): Record<string, string> {
  return {
    ...restHeaders(),
    Accept: "application/vnd.pgrst.object+json",
  };
}

/** A typed wrapper around fetch for PostgREST queries. */
export async function postgrestRequest(
  path: string,
  options: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    query?: Record<string, string>;
    body?: unknown;
    single?: boolean;
  },
): Promise<unknown> {
  const url = new URL(`${restBaseUrl()}/${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = options.single
    ? singleObjectHeaders()
    : restHeaders();

  const response = await fetch(url.toString(), {
    method: options.method,
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  // PostgREST single-object mode returns 406 (or 416 in newer versions) when
  // no row matches the filter — this is a "not found" result, not an error.
  // Return undefined so callers can treat it as `optional`.
  const NOT_FOUND_STATUSES = new Set([406, 416]);
  if (!response.ok) {
    if (options.single && options.method === "GET" && NOT_FOUND_STATUSES.has(response.status)) {
      return undefined;
    }
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `[supabase] PostgREST ${options.method} ${path} failed: ` +
        `${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`,
    );
  }

  // 204 No Content or empty body → return undefined
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text.length === 0) return undefined;
  return JSON.parse(text);
}

/** Assert that a value is an array (PostgREST returns arrays for list queries). */
function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

/** Assert that a value is a single object (PostgREST object response). */
function asObject<T>(value: unknown): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value.length === 0 ? undefined : (value[0] as T);
  }
  return value as T;
}

export { asArray, asObject };
