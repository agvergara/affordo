import { useEffect } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { NotFoundScreen } from "./Placeholder";
import { OnboardingWizard } from "./OnboardingWizard";
import { GoalsDashboard } from "./GoalsDashboard";
import { SettingsScreen } from "./SettingsScreen";
import { ToastProvider } from "./Toast";
import { AffordoProvider, useAffordo } from "../state/AffordoProvider";
import { ThemeProvider } from "../state/ThemeProvider";

export type RouteTable = Record<string, () => JSX.Element>;

/** How the gate leaves the current path. In the client-only SPA (ADR 0004/0009)
 * there is no history router, so a redirect is a real location change; tests
 * inject a spy instead. `replace` (not `assign`) keeps the gate out of history,
 * so Back doesn't bounce the user through it. */
export type Navigate = (to: string) => void;

const defaultNavigate: Navigate = (to) => window.location.replace(to);

/** The mono loading line shown while the state layer hydrates (dossier §4/§9):
 * no skeletons, one centered line. */
function Loading() {
  return (
    <main className="grid min-h-screen place-items-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        loading…
      </p>
    </main>
  );
}

/**
 * The redirect gate at `/` (dossier §2/§14). Until the state layer hydrates it
 * shows the loading line; once hydrated it leaves for `/goals` when the user has
 * a profile, else `/onboarding`. It renders no lasting UI of its own.
 */
function IndexGate({ navigate }: { navigate: Navigate }) {
  const { hydrated, hasProfile } = useAffordo();
  useEffect(() => {
    if (hydrated) navigate(hasProfile ? "/goals" : "/onboarding");
  }, [hydrated, hasProfile, navigate]);
  return <Loading />;
}

/**
 * The profile guard on `/goals` and `/settings` (dossier §14): with no profile,
 * a redirect to `/onboarding`; otherwise the screen. While hydrating each route
 * renders its own placeholder — `/goals` shows the loading line, `/settings`
 * renders nothing (`whileHydrating`), matching §14's per-route gating. Once
 * hydrated but profile-less, the loading line holds for the frame before the
 * redirect fires, so a screen assuming income never paints.
 */
function Guard({
  navigate,
  whileHydrating,
  children,
}: {
  navigate: Navigate;
  whileHydrating: JSX.Element | null;
  children: JSX.Element;
}) {
  const { hydrated, hasProfile } = useAffordo();
  useEffect(() => {
    if (hydrated && !hasProfile) navigate("/onboarding");
  }, [hydrated, hasProfile, navigate]);
  if (!hydrated) return whileHydrating;
  if (!hasProfile) return <Loading />;
  return children;
}

/**
 * Client-only path router. No SSR, no router framework (ADR 0004/0009):
 * it reads `window.location.pathname` and picks a screen from a static table.
 * `/` is the redirect gate and `/goals`/`/settings` are profile-guarded; the
 * state layer (`AffordoProvider`) is mounted at the root so both can read
 * `hydrated`/`hasProfile`. The whole routed tree sits inside the root error
 * boundary, so a render error on any route falls back to the recovery screen.
 * The toast provider wraps that boundary, so any screen — and the recovery
 * screen itself — can raise a toast (docs/affordo-context.md §9). The theme
 * layer (`ThemeProvider`) sits outermost so the persisted `.dark` class is
 * applied to the document root on every route (ADR 0021).
 *
 * `/` and the guarded routes are resolved directly (they need `navigate`);
 * `routes` holds only the unguarded screens, and a caller may override any path
 * through it (used in tests to stub a screen).
 */
export const ROUTES: RouteTable = {
  "/onboarding": () => <OnboardingWizard />,
};

/** Drop a trailing slash so `/goals/` matches `/goals`, but keep root `/`. */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function Router({
  routes = ROUTES,
  navigate = defaultNavigate,
}: { routes?: RouteTable; navigate?: Navigate } = {}) {
  const path = normalize(window.location.pathname);
  const supplied = routes[path];

  let screen: JSX.Element;
  if (supplied) {
    screen = supplied();
  } else if (path === "/") {
    screen = <IndexGate navigate={navigate} />;
  } else if (path === "/goals") {
    screen = (
      <Guard navigate={navigate} whileHydrating={<Loading />}>
        <GoalsDashboard />
      </Guard>
    );
  } else if (path === "/settings") {
    // §14: /settings renders nothing while hydrating (no loading line).
    screen = (
      <Guard navigate={navigate} whileHydrating={null}>
        <SettingsScreen />
      </Guard>
    );
  } else {
    screen = <NotFoundScreen />;
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AffordoProvider>
          <ErrorBoundary>{screen}</ErrorBoundary>
        </AffordoProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
