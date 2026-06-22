import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
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
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-ring/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-md"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All coaches
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{coach.name}</h1>
          <p className="mt-1 text-muted-foreground">{coach.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{coach.location}</p>

          <p className="mt-6 max-w-prose text-foreground/90">{coach.bio}</p>

          <h2 className="mt-10 text-lg font-bold">What you get</h2>
          <ul className="mt-3 space-y-2">
            {coach.highlights.map((h) => (
              <li key={h} className="flex gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {coach.testimonials.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-bold">Testimonials</h2>
              <div className="mt-3 space-y-3">
                {coach.testimonials.map((t) => (
                  <Card key={t.author} className="border-border/70 p-4 text-sm">
                    <blockquote>
                      <p className="italic text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
                      <footer className="mt-2 text-xs text-muted-foreground">
                        — {t.author}
                      </footer>
                    </blockquote>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Booking sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border-border/70 p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">${coach.priceUsd}</span>
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
          </Card>
        </aside>
      </div>
    </Container>
  );
}

import { humanizeTurnaround } from "@/lib/turnaround";
