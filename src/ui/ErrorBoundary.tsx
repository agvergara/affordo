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
        <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center text-foreground">
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">
            Something broke
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            The audit could not load.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center border border-border bg-foreground px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center border border-border px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-foreground hover:text-background"
            >
              Go home
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
