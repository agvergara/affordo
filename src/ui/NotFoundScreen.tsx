/**
 * Full-screen 404 in the reference "industrial audit" look (dossier §2/§3/§6b):
 * a large `font-display` `404` numeral, a mono uppercase `Page not found`
 * label, and a `Go home` link back to `/`. Copy is verbatim.
 *
 * The layout is the reference's `NotFoundComponent` (`__root.tsx:19`): a
 * full-height flex container centring a `max-w-md` column. Ours was a single
 * `flex-col … gap-6 … py-16` column with no inner wrapper, so nothing
 * constrained the text width and the vertical rhythm came from one gap rather
 * than the per-element margins the reference uses (#127).
 *
 * `Go home` here is **solid** — filled, hovering to outline. The error screen's
 * `Go home` is the outline one. Ours had both as the same outline control,
 * collapsing a distinction the reference draws deliberately (§6b).
 *
 * The element stays a `<main>` where the reference uses a `<div>`. That is a
 * knowing divergence: dropping it removes the only landmark on this screen, so
 * it belongs with the `<ul>`/`<li>` question on `/goals` and the rest of
 * #115/#116/#99 rather than being settled here.
 */
export function NotFoundScreen() {
  return (
    <main
      data-testid="notfound-shell"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div data-testid="notfound-column" className="max-w-md text-center">
        <h1 className="font-display text-8xl uppercase tracking-tight text-foreground">
          404
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Page not found
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center border-2 border-foreground bg-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-transparent hover:text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
