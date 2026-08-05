import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Root error boundary for the SPA. A render error anywhere in the routed tree
 * is caught here and replaced with a recovery screen, so an exception never
 * leaves the user staring at a blank page. Client-only (ADR 0004): the error is
 * logged to the console, never sent anywhere.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Affordo caught a render error", error, info);
  }

  /** Clear the caught error and re-render the routed tree from scratch. */
  private reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        /*
         * The reference's `ErrorComponent` (`__root.tsx:45`): the same centred
         * `max-w-md` column the 404 uses, but a `text-4xl` heading against the
         * 404's `text-8xl` — the error screen is deliberately the quieter of
         * the two. Ours had them the same size, and larger than either.
         *
         * The two controls are a matched pair: `Try again` is solid and hovers
         * to outline, `Go home` is outline and hovers to solid. Ours had both
         * bordered at `border-border` with `Try again` hovering to accent, so
         * the inversion between them was lost.
         *
         * `rounded-none` on the `<button>` is #135: this port's base layer
         * gives every button a 10px radius that the reference, which has no
         * global button rule, does not. The `<a>` is unaffected — the rule
         * targets `button` only, which is why only one of the pair carries it.
         */
        <main
          data-testid="error-shell"
          className="flex min-h-screen items-center justify-center bg-background px-4"
        >
          <div data-testid="error-column" className="max-w-md text-center">
            <h1 className="font-display text-4xl uppercase tracking-tight">
              Something broke
            </h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              The audit could not load.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={this.reset}
                className="rounded-none border-2 border-foreground bg-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-transparent hover:text-foreground"
              >
                Try again
              </button>
              <a
                href="/"
                className="border-2 border-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background"
              >
                Go home
              </a>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
