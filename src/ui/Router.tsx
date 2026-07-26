import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  GoalsScreen,
  NotFoundScreen,
  OnboardingScreen,
  SettingsScreen,
} from "./Placeholder";
import { ToastProvider } from "./Toast";

export type RouteTable = Record<string, () => JSX.Element>;

/**
 * Client-only path router. No SSR, no router framework (ADR 0004/0009):
 * it reads `window.location.pathname` and picks a screen from a static table.
 * The redirect gate on `/` is a later slice — here `/` is the calculator.
 * The whole routed tree sits inside the root error boundary, so a render error
 * on any route falls back to the recovery screen rather than a blank page.
 * The toast provider wraps that boundary, so any screen — and the recovery
 * screen itself — can raise a toast (docs/affordo-context.md §9).
 */
export const ROUTES: RouteTable = {
  "/": () => <App />,
  "/onboarding": () => <OnboardingScreen />,
  "/goals": () => <GoalsScreen />,
  "/settings": () => <SettingsScreen />,
};

/** Drop a trailing slash so `/goals/` matches `/goals`, but keep root `/`. */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function Router({ routes = ROUTES }: { routes?: RouteTable } = {}) {
  const path = normalize(window.location.pathname);
  const screen = routes[path];
  return (
    <ToastProvider>
      <ErrorBoundary>{screen ? screen() : <NotFoundScreen />}</ErrorBoundary>
    </ToastProvider>
  );
}
