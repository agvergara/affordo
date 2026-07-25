import { App } from "./App";

/**
 * Client-only path router. No SSR, no router framework (ADR 0004/0009):
 * it reads `window.location.pathname` and picks a screen from a static table.
 * The redirect gate on `/` is a later slice — here `/` is the calculator.
 */
const ROUTES: Record<string, () => JSX.Element> = {
  "/": () => <App />,
};

export function Router() {
  const path = window.location.pathname;
  const screen = ROUTES[path];
  return screen ? screen() : <App />;
}
