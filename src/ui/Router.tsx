import { App } from "./App";
import {
  GoalsScreen,
  NotFoundScreen,
  OnboardingScreen,
  SettingsScreen,
} from "./Placeholder";

/**
 * Client-only path router. No SSR, no router framework (ADR 0004/0009):
 * it reads `window.location.pathname` and picks a screen from a static table.
 * The redirect gate on `/` is a later slice — here `/` is the calculator.
 */
const ROUTES: Record<string, () => JSX.Element> = {
  "/": () => <App />,
  "/onboarding": () => <OnboardingScreen />,
  "/goals": () => <GoalsScreen />,
  "/settings": () => <SettingsScreen />,
};

export function Router() {
  const path = window.location.pathname;
  const screen = ROUTES[path];
  return screen ? screen() : <NotFoundScreen />;
}
