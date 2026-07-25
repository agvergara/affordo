import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  GoalsScreen,
  NotFoundScreen,
  OnboardingScreen,
  SettingsScreen,
} from "./Placeholder";

export type RouteTable = Record<string, () => JSX.Element>;

/**
 * Client-only path router. No SSR, no router framework (ADR 0004/0009):
 * it reads `window.location.pathname` and picks a screen from a static table.
 * The redirect gate on `/` is a later slice — here `/` is the calculator.
 * The whole routed tree sits inside the root error boundary, so a render error
 * on any route falls back to the recovery screen rather than a blank page.
 */
export const ROUTES: RouteTable = {
  "/": () => <App />,
  "/onboarding": () => <OnboardingScreen />,
  "/goals": () => <GoalsScreen />,
  "/settings": () => <SettingsScreen />,
};

export function Router({ routes = ROUTES }: { routes?: RouteTable } = {}) {
  const path = window.location.pathname;
  const screen = routes[path];
  return (
    <ErrorBoundary>{screen ? screen() : <NotFoundScreen />}</ErrorBoundary>
  );
}
