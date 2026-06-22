import type {
  EmailAdapter,
  SendLessonDeliveryInput,
  SendEmailResult,
} from "./types";

const RESEND_API_BASE = "https://api.resend.com";

/** Default "from" address — Resend's sandbox sender works without domain verification. */
const DEFAULT_FROM = "SwingLab <onboarding@resend.dev>";

function buildSubject(coachName: string): string {
  return `${coachName} sent you a swing review lesson`;
}

function buildHtmlBody(input: SendLessonDeliveryInput): string {
  const greeting = input.parentName
    ? `Hi ${input.parentName},`
    : "Hi,";
  return [
    `<!DOCTYPE html>`,
    `<html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">`,
    `<p>${greeting}</p>`,
    `<p>Your coach <strong>${input.coachName}</strong> has completed your swing review lesson.</p>`,
    `<p style="margin:24px 0;">`,
    `  <a href="${input.lessonUrl}" ` +
      `style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">`,
    `    View your lesson`,
    `  </a>`,
    `</p>`,
    `<p style="color:#666;font-size:14px;">`,
    `  This link is private and unique to you. Do not share it with others.`,
    `</p>`,
    `<p style="color:#999;font-size:12px;">SwingLab</p>`,
    `</body></html>`,
  ].join("\n");
}

/**
 * Real Resend email adapter — used when RESEND_API_KEY is present in env.
 * Uses fetch() directly (no SDK dependency) for consistency with the
 * Supabase PostgREST and Stripe adapter patterns.
 *
 * sendLessonDeliveryEmail posts to Resend's /emails endpoint with a
 * subject + HTML body containing the magic-link lesson URL.
 */
export class ResendEmailAdapter implements EmailAdapter {
  readonly mode = "live" as const;
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? "";
    this.fromAddress = process.env.EMAIL_FROM ?? DEFAULT_FROM;
    // Defense-in-depth: the factory already gates on isLive("email"), but
    // constructing directly without a key should fail fast.
    if (!this.apiKey) {
      throw new Error("ResendEmailAdapter requires RESEND_API_KEY");
    }
  }

  async sendLessonDeliveryEmail(
    input: SendLessonDeliveryInput,
  ): Promise<SendEmailResult> {
    if (!input.to || input.to.trim().length === 0) {
      return {
        success: false,
        messageId: null,
        mode: "live",
        error: "Recipient email is required",
      };
    }
    if (!input.lessonUrl || input.lessonUrl.trim().length === 0) {
      return {
        success: false,
        messageId: null,
        mode: "live",
        error: "Lesson URL is required",
      };
    }

    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [input.to],
        subject: buildSubject(input.coachName),
        html: buildHtmlBody(input),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        messageId: null,
        mode: "live",
        error: `Resend API error: ${res.status} ${text}`,
      };
    }

    const data = (await res.json()) as { id: string };
    return {
      success: true,
      messageId: data.id,
      mode: "live",
    };
  }
}
