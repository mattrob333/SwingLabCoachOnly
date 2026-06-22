import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCoachBySlug, getAllCoachSlugs } from "@/lib/coaches";

export async function generateStaticParams() {
  return (await getAllCoachSlugs()).map((slug) => ({ slug }));
}

export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const coach = await getCoachBySlug(slug);
  if (!coach) return { title: "Coach not found" };
  return {
    title: `${coach.name} — ${coach.title}`,
    description: coach.bio,
  };
}

export default async function CoachProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const coach = await getCoachBySlug(slug);
  if (!coach) notFound();

  return (
    <Container className="py-12">
      <Link
        href="/coaches"
        className="mb-6 inline-block text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← All coaches
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{coach.name}</h1>
          <p className="mt-1 text-muted-foreground">{coach.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{coach.location}</p>

          <p className="mt-6 max-w-prose text-foreground/90">{coach.bio}</p>

          <h2 className="mt-10 text-lg font-semibold">What you get</h2>
          <ul className="mt-3 space-y-2">
            {coach.highlights.map((h) => (
              <li key={h} className="flex gap-2 text-sm">
                <span aria-hidden className="text-primary">
                  ✓
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {coach.testimonials.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold">Testimonials</h2>
              <div className="mt-3 space-y-3">
                {coach.testimonials.map((t) => (
                  <blockquote
                    key={t.author}
                    className="rounded-xl border border-border bg-card p-4 text-sm"
                  >
                    <p className="italic text-foreground/90">“{t.quote}”</p>
                    <footer className="mt-2 text-xs text-muted-foreground">
                      — {t.author}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Booking sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">${coach.priceUsd}</span>
              <span className="text-sm text-muted-foreground">per review</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Typical turnaround: {humanizeTurnaround(coach.turnaround)}
            </p>
            <Link
              href={`/upload?coach=${coach.slug}`}
              className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
            >
              Upload a swing
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Secure checkout · Parent-friendly
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}

import { humanizeTurnaround } from "@/lib/turnaround";
