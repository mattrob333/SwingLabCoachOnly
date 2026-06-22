import type {
  EmailAdapter,
  SendLessonDeliveryInput,
  SendEmailResult,
} from "./types";

/**
 * In-memory store of mock-sent emails (for test inspection).
 * Each entry is the input + a timestamp, so tests can assert on the
 * subject/body without coupling to email rendering internals.
 */
export type MockSentEmail = {
  to: string;
  parentName?: string;
  coachName: string;
  lessonUrl: string;
  submissionId: string;
  sentAt: number;
};

export const MOCK_SENT_EMAILS: MockSentEmail[] = [];

/**
 * Mock email adapter — used when RESEND_API_KEY is absent.
 *
 * Logs to console and stores the email in MOCK_SENT_EMAILS for test
 * inspection. Returns success immediately. No external calls.
 */
export class MockEmailAdapter implements EmailAdapter {
  readonly mode = "mock" as const;

  async sendLessonDeliveryEmail(
    input: SendLessonDeliveryInput,
  ): Promise<SendEmailResult> {
    if (!input.to || input.to.trim().length === 0) {
      return {
        success: false,
        messageId: null,
        mode: "mock",
        error: "Recipient email is required",
      };
    }
    if (!input.lessonUrl || input.lessonUrl.trim().length === 0) {
      return {
        success: false,
        messageId: null,
        mode: "mock",
        error: "Lesson URL is required",
      };
    }

    const entry: MockSentEmail = {
      to: input.to,
      parentName: input.parentName,
      coachName: input.coachName,
      lessonUrl: input.lessonUrl,
      submissionId: input.submissionId,
      sentAt: Date.now(),
    };
    MOCK_SENT_EMAILS.push(entry);

    console.log(
      `[email:mock] lesson delivery email → ${input.to} ` +
        `(coach: ${input.coachName}, submission: ${input.submissionId})`,
    );

    return {
      success: true,
      messageId: null,
      mode: "mock",
    };
  }
}
