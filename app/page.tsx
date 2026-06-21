import Link from "next/link";
import { Container } from "@/components/site/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COACHES } from "@/lib/coaches";

const STEPS = [
  {
    title: "1. Pick a coach",
    body: "Browse vetted hitting coaches and choose the right fit for your player.",
  },
  {
    title: "2. Upload a swing",
    body: "Record from any phone. Upload a clip in seconds — no app required.",
  },
  {
    title: "3. Get your lesson",
    body: "Receive a voice-over video review plus a drill plan, usually within 24 hours.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-background">
        <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Web-first · No app required
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Turn a swing video into a paid lesson in{" "}
            <span className="text-primary">5–10 minutes</span>.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            SwingLab gives hitting coaches the fastest workflow to review
            swings, deliver voice-over lessons, and keep parents coming back.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/coaches" className={cn(buttonVariants({ size: "lg" }))}>
              Find a coach
            </Link>
            <Link
              href="/coach/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              I&apos;m a coach
            </Link>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-b border-border/60">
        <Container className="py-14">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-left">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="mb-2 font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured coaches */}
      <section>
        <Container className="py-14">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured coaches
            </h2>
            <Link
              href="/coaches"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {COACHES.map((coach) => (
              <Link
                key={coach.slug}
                href={`/coaches/${coach.slug}`}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{coach.name}</h3>
                    <p className="text-sm text-muted-foreground">{coach.title}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                    ${coach.priceUsd}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {coach.bio}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-primary group-hover:underline">
                  View profile →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
