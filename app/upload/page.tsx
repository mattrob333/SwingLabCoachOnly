import { Container } from "@/components/site/container";

export const metadata = {
  title: "Upload a swing",
  description: "Upload a swing video for review.",
};

/**
 * Phase 1 stub. The full parent upload flow (video capture, transcoding,
 * payment) lands in Phase 3 — see docs/TASKS.md.
 */
export default function UploadPage() {
  return (
    <Container className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Upload a swing</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        The guided upload flow is coming soon. For now, browse our coaches and
        we&apos;ll notify you when uploads open.
      </p>
    </Container>
  );
}
