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

/**
 * Full-screen 404 in the reference "industrial audit" look (dossier §2/§3):
 * a large `font-display` `404` numeral, a mono uppercase `Page not found`
 * label, and a bordered `Go home` link back to `/`. Copy is verbatim.
 */
export function NotFoundScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center text-foreground">
      <h1 className="font-display text-8xl uppercase tracking-tight">404</h1>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Page not found
      </p>
      <a
        href="/"
        className="inline-flex items-center border border-border px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-foreground hover:text-background"
      >
        Go home
      </a>
    </main>
  );
}
