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
