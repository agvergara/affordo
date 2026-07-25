/**
 * Minimal placeholder screens for routes whose real UI lands in later slices.
 * Each renders a titled shell with a link back to the calculator so a user is
 * never stranded on a stub.
 */
function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-muted">{body}</p>
      <a href="/" className="mt-8 inline-block underline">
        Back to Affordo
      </a>
    </main>
  );
}

export function OnboardingScreen() {
  return (
    <Placeholder
      title="Onboarding"
      body="The onboarding wizard lands in a later slice."
    />
  );
}

export function GoalsScreen() {
  return (
    <Placeholder
      title="Goals"
      body="The goals dashboard lands in a later slice."
    />
  );
}

export function SettingsScreen() {
  return (
    <Placeholder
      title="Settings"
      body="The settings screen lands in a later slice."
    />
  );
}

export function NotFoundScreen() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="mt-4 text-muted">Page not found.</p>
      <a href="/" className="mt-8 inline-block underline">
        Go home
      </a>
    </main>
  );
}
