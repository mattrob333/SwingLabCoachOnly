import { Container } from "@/components/site/container";
import { UploadForm } from "@/components/upload/upload-form";
import { COACHES } from "@/lib/coaches";

export const metadata = {
  title: "Upload a swing",
  description: "Upload a swing video for review by a SwingLab coach.",
};

export default function UploadPage() {
  return (
    <Container className="py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Upload a swing</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pick a coach, upload your video, and get a personalized voice-over
          review back fast.
        </p>
      </div>

      <UploadForm coaches={COACHES} />
    </Container>
  );
}
