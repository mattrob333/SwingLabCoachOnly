import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { OnboardingForm } from "@/components/coach/onboarding-form";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getCoachBySlug } from "@/lib/coaches";

export const metadata = {
  title: "Coach onboarding",
  description: "Set up your SwingLab coach profile.",
};

export default async function CoachOnboardingPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    notFound();
  }

  // Pre-fill the form if the coach already has a profile record.
  const existing = getCoachBySlug(session.coachSlug);

  return (
    <Container className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {existing ? "Edit your profile" : "Welcome — let&apos;s set up your profile"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parents see this on your public coach page. You can change it anytime.
        </p>
      </div>

      <OnboardingForm
        initial={
          existing
            ? {
                name: existing.name,
                title: existing.title,
                bio: existing.bio,
                location: existing.location,
                priceUsd: String(existing.priceUsd),
                turnaround: existing.turnaround,
                highlights: existing.highlights.join("\n"),
              }
            : undefined
        }
      />
    </Container>
  );
}
