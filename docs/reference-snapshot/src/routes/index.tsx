import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAffordo } from "@/lib/affordo-context";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { hydrated, hasProfile } = useAffordo();
  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          loading…
        </p>
      </div>
    );
  }
  return <Navigate to={hasProfile ? "/goals" : "/onboarding"} />;
}
