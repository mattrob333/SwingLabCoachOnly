import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { PaymentForm } from "@/components/pay/payment-form";
import { getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";

export const metadata = {
  title: "Complete payment",
  description: "Pay for your swing review.",
};

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string }>;
}) {
  const { submission: submissionId } = await searchParams;

  if (!submissionId) {
    notFound();
  }

  const submission = getSubmissionById(submissionId);
  if (!submission) {
    notFound();
  }

  // If already paid, redirect to submission detail (future route).
  // For now just show a message.
  if (submission.status !== "pending_payment") {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment complete
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This submission has already been paid. Your coach will begin the
          review soon.
        </p>
      </Container>
    );
  }

  const coach = getCoachBySlug(submission.coachSlug);
  if (!coach) {
    notFound();
  }

  return (
    <Container className="py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete your payment
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {coach.name} will start your review once payment is confirmed.
        </p>
      </div>

      <PaymentForm
        submissionId={submission.id}
        coachName={coach.name}
        priceUsd={coach.priceUsd}
      />
    </Container>
  );
}
