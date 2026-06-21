import { Container } from "@/components/site/container";

export const metadata = {
  title: "How it works",
  description: "How SwingLab turns a swing video into a paid lesson.",
};

const STEPS = [
  {
    title: "Pick a coach",
    body: "Browse vetted hitting coaches. Each coach sets their own price and turnaround time.",
  },
  {
    title: "Upload a swing",
    body: "Record from any phone (Android Chrome or iPhone Safari). Upload a clip in seconds — no app required.",
  },
  {
    title: "Coach reviews",
    body: "Your coach records a voice-over video review with frame-by-frame annotations inside the Review Studio.",
  },
  {
    title: "Get your lesson",
    body: "Receive a lesson pack: the annotated video plus a personalized drill plan. Usually delivered within 24 hours.",
  },
  {
    title: "Follow up",
    body: "Practice the drills, then submit a follow-up swing to track progress over time.",
  },
];

export default function HowItWorksPage() {
  return (
    <Container className="py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">How it works</h1>
      <ol className="space-y-6">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium">{step.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Container>
  );
}
