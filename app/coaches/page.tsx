import Link from "next/link";
import { Container } from "@/components/site/container";
import { COACHES } from "@/lib/coaches";

export const metadata = {
  title: "Coaches",
  description: "Browse SwingLab hitting coaches and book a swing review.",
};

export default function CoachesPage() {
  return (
    <Container className="py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Coaches</h1>
      <p className="mb-8 text-muted-foreground">
        Pick a coach and upload a swing — get a voice-over review back fast.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {COACHES.map((coach) => (
          <Link
            key={coach.slug}
            href={`/coaches/${coach.slug}`}
            className="group flex flex-col rounded-xl border border-border/70 bg-card p-5 transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-md focus-visible:outline-ring/50 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{coach.name}</h2>
                <p className="text-sm text-muted-foreground">{coach.title}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                ${coach.priceUsd}
              </span>
            </div>
            <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
              {coach.bio}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {coach.location}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
