import { Container } from "@/components/site/container";

export const metadata = {
  title: "Coach login",
  description: "Sign in to the SwingLab coach studio.",
};

/**
 * Phase 1 stub. Auth + coach studio land in Phase 2 — see docs/TASKS.md.
 */
export default function CoachLoginPage() {
  return (
    <Container className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Coach login</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        Coach authentication and the Review Studio are coming soon.
      </p>
    </Container>
  );
}
