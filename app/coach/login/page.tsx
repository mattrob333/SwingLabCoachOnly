import { Suspense } from "react";
import { Container } from "@/components/site/container";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Coach login",
  description: "Sign in to the SwingLab coach studio.",
};

export default function CoachLoginPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Coach login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to access your coach dashboard and Review Studio.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </Container>
  );
}
