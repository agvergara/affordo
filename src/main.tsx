import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Router } from "./ui/Router";
import "./styles/theme.css";

/**
 * Vercel Web Analytics and Speed Insights (#160, ADR 0025).
 *
 * Mounted here rather than inside `Router` for two reasons. The router picks a
 * screen from a static table and re-reads `window.location` on each render
 * (ADR 0018); anything mounted inside it is subject to that. And these render
 * nothing — keeping them out of the routed tree keeps the screen a route
 * resolves to the only thing in it.
 *
 * They sit outside the root error boundary deliberately. The boundary lives
 * inside `Router` and swaps the routed tree for a recovery screen; measurement
 * of a session that hit an error is the measurement most worth having, so it
 * must not be unmounted by the thing it is measuring.
 *
 * Both beacon to the deploying origin (`/_vercel/…`), not to a third-party host,
 * which is why `e2e/privacy.spec.ts` still passes — see the note there about
 * what that spec does and does not prove now.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
