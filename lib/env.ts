/**
 * Env-gated integration validation.
 *
 * Every external integration (Supabase, storage, Deepgram, OpenAI, Stripe,
 * email) runs in one of two modes:
 *   - "live": the required env keys are present -> the real service is used.
 *   - "mock": at least one required key is missing -> the existing in-memory
 *     fallback is used.
 *
 * This module NEVER throws on missing keys. It only reports modes and logs
 * warnings so the user can flip integrations live by adding keys to `.env`.
 */

export type IntegrationName =
  | "database"
  | "storage"
  | "transcription"
  | "ai"
  | "payments"
  | "email";

export type IntegrationMode = "live" | "mock";

export type IntegrationModes = Record<IntegrationName, IntegrationMode>;

const isNonEmpty = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Each integration lists the env vars it needs. The integration is "live"
 * only when ALL of its required keys are present and non-empty.
 */
const INTEGRATION_KEYS: Record<IntegrationName, readonly string[]> = {
  // Supabase Postgres: project URL + service-role key (server-side only).
  database: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  // Supabase Storage: same credentials drive the storage adapter.
  storage: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  // Deepgram transcription worker.
  transcription: ["DEEPGRAM_API_KEY"],
  // OpenAI lesson packaging worker.
  ai: ["OPENAI_API_KEY"],
  // Stripe Checkout + webhooks: all three keys required for replay-safe flow.
  payments: [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ],
  // Resend email provider for magic-link lesson delivery.
  email: ["RESEND_API_KEY"],
};

const ALL_INTEGRATIONS: readonly IntegrationName[] = [
  "database",
  "storage",
  "transcription",
  "ai",
  "payments",
  "email",
];

function keysPresent(keys: readonly string[]): boolean {
  return keys.every((k) => isNonEmpty(process.env[k]));
}

/**
 * Returns the current mode for every integration, computed live from
 * `process.env` on each call so tests / hot-reloads reflect env changes.
 */
export function getIntegrationModes(): IntegrationModes {
  const modes = {} as IntegrationModes;
  for (const name of ALL_INTEGRATIONS) {
    modes[name] = keysPresent(INTEGRATION_KEYS[name]) ? "live" : "mock";
  }
  return modes;
}

const INTEGRATION_LABEL: Record<IntegrationName, string> = {
  database: "Supabase Postgres",
  storage: "Supabase Storage",
  transcription: "Deepgram transcription",
  ai: "OpenAI lesson packaging",
  payments: "Stripe payments",
  email: "Resend email delivery",
};

/**
 * Logs a single warning per integration that is currently in mock mode.
 * Never throws. Safe to call at module load or on demand.
 */
export function logIntegrationModes(): void {
  const modes = getIntegrationModes();
  for (const name of ALL_INTEGRATIONS) {
    if (modes[name] === "mock") {
      const required = INTEGRATION_KEYS[name].join(", ");
      console.warn(
        `[env] ${name} (${INTEGRATION_LABEL[name]}) running in MOCK mode ` +
          `(missing: ${required}). Add the key(s) to .env to enable the live service.`,
      );
    }
  }
}

export function isLive(name: IntegrationName): boolean {
  if (!ALL_INTEGRATIONS.includes(name)) {
    throw new Error(`Unknown integration: ${name as string}`);
  }
  return keysPresent(INTEGRATION_KEYS[name]);
}

export function isMock(name: IntegrationName): boolean {
  return !isLive(name);
}
