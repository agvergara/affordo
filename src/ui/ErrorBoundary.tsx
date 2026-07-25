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

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-16">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-4 text-muted">
            An unexpected error occurred. Reloading may help.
          </p>
          <a href="/" className="mt-8 inline-block underline">
            Go home
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}
