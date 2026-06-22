import { Container } from "@/components/site/container";
import { UploadForm } from "@/components/upload/upload-form";
import { COACHES } from "@/lib/coaches";
import { getSubmissionById } from "@/lib/submissions";

export const metadata = {
  title: "Upload a swing",
  description: "Upload a swing video for review by a SwingLab coach.",
};

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ followUpFor?: string }>;
}) {
  const { followUpFor } = await searchParams;

  // If this is a follow-up, verify the original submission exists.
  const original = followUpFor ? await getSubmissionById(followUpFor) : undefined;
  const isFollowUp = Boolean(original);

  return (
    <Container className="py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isFollowUp ? "Submit a follow-up swing" : "Upload a swing"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {isFollowUp
            ? "Got feedback from your last lesson? Submit a new swing and your coach will review your progress."
            : "Pick a coach, upload your video, and get a personalized voice-over review back fast."}
        </p>
      </div>

      {isFollowUp && (
        <div className="mx-auto mb-6 max-w-lg rounded-xl border border-info/30 bg-info/10 p-4 text-sm text-info-foreground">
          Following up on your previous lesson. Your coach will see the link to
          your original review.
        </div>
      )}

      <UploadForm
        coaches={COACHES}
        {...(isFollowUp ? { followUpFor: original!.id } : {})}
      />
    </Container>
  );
}
