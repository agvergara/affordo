// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "./Router";
import { useToast } from "./Toast";
import { saveProfile } from "../state/profile-store";
import { defaultProfile } from "../state/profile-store";

/** Point the SPA at a client path before mounting the Router. */
function navigateTo(path: string) {
  window.history.pushState({}, "", path);
}

/** Persist a real profile (salary > 0) so `hasProfile` hydrates true. */
function seedProfile() {
  saveProfile({ ...defaultProfile, salary: 1300 });
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.history.pushState({}, "", "/"));

describe("Router — redirect gate at /", () => {
  it("shows a loading line at / until hydrated", () => {
    navigateTo("/");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    // First paint, before the post-mount hydration effect: a loading line and
    // no redirect yet (hasProfile is unknown until localStorage is read).
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects / to /onboarding once hydrated without a profile", async () => {
    navigateTo("/");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding"));
  });

  it("redirects / to /goals once hydrated with a profile", async () => {
    seedProfile();
    navigateTo("/");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/goals"));
  });

  it("does not render the calculator at /", () => {
    navigateTo("/");
    render(<Router navigate={vi.fn()} />);

    // The redirect gate has replaced the old calculator bridge.
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });
});

describe("Router — per-route guards", () => {
  it("redirects /goals to /onboarding when there is no profile", async () => {
    navigateTo("/goals");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding"));
  });

  it("redirects /settings to /onboarding when there is no profile", async () => {
    navigateTo("/settings");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding"));
  });

  it("renders the goals dashboard when a profile is present", async () => {
    seedProfile();
    navigateTo("/goals");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /goals/i }),
      ).toBeInTheDocument(),
    );
    // The real dashboard mounts here (not the placeholder): its profile
    // snapshot is present. Asserted on a *cell*, not on the `snapshot` wrapper
    // — #134 moved that testid from the grid to the outer section, and this
    // assertion silently became a check on a rule-topped div that would pass
    // with the entire grid deleted. A cell only the real dashboard renders is
    // what the sentence above always meant.
    expect(screen.getByTestId("snapshot-time-value")).toBeInTheDocument();
    expect(screen.getByTestId("snapshot-grid")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("renders /settings when a profile is present", async () => {
    seedProfile();
    navigateTo("/settings");
    const navigate = vi.fn();
    render(<Router navigate={navigate} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /settings/i }),
      ).toBeInTheDocument(),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("routes a confirmed settings reset back to /onboarding", async () => {
    seedProfile();
    navigateTo("/settings");
    const navigate = vi.fn();
    // The screen's default confirm is `window.confirm`; stub the global so the
    // route wiring is exercised end-to-end without a blocking dialog.
    const confirm = vi.spyOn(window, "confirm").mockImplementation(() => true);
    // A screen that fell back to its own default navigate would really replace
    // the document here; this stub is what tells the two apart. jsdom forbids
    // spying on `location.replace`, so swap the whole object — the Router only
    // reads `pathname` off it.
    const replace = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/settings", replace },
    });
    const restoreLocation = () =>
      Object.defineProperty(window, "location", {
        configurable: true,
        value: realLocation,
      });
    const user = userEvent.setup();

    try {
      render(<Router navigate={navigate} />);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Reset everything" }),
        ).toBeInTheDocument(),
      );
      await user.click(
        screen.getByRole("button", { name: "Reset everything" }),
      );

      // The route passes its own navigate down, so the reset lands on onboarding
      // through the injected seam — never by really re-loading the document.
      expect(navigate).toHaveBeenCalledWith("/onboarding");
      expect(replace).not.toHaveBeenCalled();
    } finally {
      // Restore even on failure, so a red assertion here can't leak a stubbed
      // location into every later test in this file.
      confirm.mockRestore();
      restoreLocation();
    }
  });
});

describe("Router — unguarded routes", () => {
  it("renders the onboarding wizard at /onboarding without a profile", () => {
    navigateTo("/onboarding");
    render(<Router navigate={vi.fn()} />);

    // The wizard chrome opens on step 0 (Welcome, 01 / 04); no guard applies.
    expect(screen.getByText("Set up your reckoning")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Welcome" }),
    ).toBeInTheDocument();
    expect(screen.getByText("01 / 04")).toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });

  it("ignores a trailing slash on a known path", async () => {
    seedProfile();
    navigateTo("/goals/");
    render(<Router navigate={vi.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /goals/i }),
      ).toBeInTheDocument(),
    );
    // A trailing slash must not fall through to the 404.
    expect(screen.queryByRole("heading", { name: /404/i })).toBeNull();
  });

  it("renders the 404 screen for an unknown path", () => {
    navigateTo("/nope");
    render(<Router navigate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /404/i })).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly net income/i)).toBeNull();
  });

  it("renders the root error boundary when a route throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    navigateTo("/onboarding");
    const Boom = (): JSX.Element => {
      throw new Error("kaboom");
    };
    render(
      <Router routes={{ "/onboarding": () => <Boom /> }} navigate={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "Something broke" }),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("mounts a toast provider at the root so any route can raise a toast", async () => {
    const user = userEvent.setup();
    navigateTo("/onboarding");
    function Screen() {
      const { toast } = useToast();
      return <button onClick={() => toast("Saved")}>save</button>;
    }
    render(
      <Router
        routes={{ "/onboarding": () => <Screen /> }}
        navigate={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});

describe("Router — per-screen document head (#111)", () => {
  const meta = (attr: "name" | "property", key: string) =>
    document.head
      .querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      ?.getAttribute("content");

  it.each([
    [
      "/onboarding",
      "Set up · Affordo",
      "Configure your financial profile once. Then weigh purchases in seconds.",
    ],
    [
      "/goals",
      "Goals · Affordo",
      "See every purchase weighed against your working hours.",
    ],
    [
      "/settings",
      "Settings · Affordo",
      "Edit your financial profile and preferences.",
    ],
  ])("titles %s as %s", (path, title, description) => {
    seedProfile();
    navigateTo(path);
    render(<Router navigate={vi.fn()} />);
    expect(document.title).toBe(title);
    expect(meta("name", "description")).toBe(description);
    // og:title tracks the title, and og:description the description — the two
    // are equal on every sub-route and differ only at the root (§1).
    expect(meta("property", "og:title")).toBe(title);
    expect(meta("property", "og:description")).toBe(description);
  });

  it("uses the separator the dossier records, a middle dot", () => {
    seedProfile();
    navigateTo("/goals");
    render(<Router navigate={vi.fn()} />);
    // U+00B7, not a bullet (•) or a hyphen — invisible to read, and the kind of
    // thing a copy-paste silently changes.
    expect(document.title).toContain("·");
    expect(document.title).not.toContain("•");
  });

  it("restores the root head on a screen that has none of its own", () => {
    navigateTo("/nonsense");
    render(<Router navigate={vi.fn()} />);
    expect(document.title).toBe("Affordo — Audit: Life/Cost");
    // The root is the one place description and og:description differ.
    expect(meta("name", "description")).toBe(
      "Weigh purchases against your working hours. A private, local-first affordability calculator.",
    );
    expect(meta("property", "og:description")).toBe(
      "Weigh purchases against your working hours.",
    );
  });

  it("does not leave a previous screen's title behind", () => {
    seedProfile();
    navigateTo("/goals");
    const first = render(<Router navigate={vi.fn()} />);
    expect(document.title).toBe("Goals · Affordo");
    first.unmount();

    navigateTo("/nonsense");
    render(<Router navigate={vi.fn()} />);
    // The failure this guards is a head applied once at mount: the 404 would
    // keep announcing itself as the goals dashboard.
    expect(document.title).toBe("Affordo — Audit: Life/Cost");
  });
});

describe("Router — head is keyed on the path, not the outcome (#111)", () => {
  function Boom(): JSX.Element {
    throw new Error("boom");
  }

  it("keeps a titled route's head when its screen throws", () => {
    seedProfile();
    navigateTo("/goals");
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<Router routes={{ "/goals": () => <Boom /> }} navigate={vi.fn()} />);

    // The error boundary is what the user sees…
    expect(screen.getByText(/something broke/i)).toBeInTheDocument();
    // …but the tab still names the route, because `head()` belongs to the
    // route that matched rather than to the outcome of rendering it. Pinned
    // because the docblock previously claimed the opposite.
    expect(document.title).toBe("Goals · Affordo");
  });
});

describe("Router — the redirect gate keeps the root head (#111)", () => {
  it("titles / with the root head, not the screen it redirects to", () => {
    navigateTo("/");
    render(<Router navigate={vi.fn()} />);

    // §1: "Route `/` has no head() — inherits root defaults only." The gate is
    // the app's entry URL, so getting this wrong means the very first thing a
    // user sees in their tab is the name of a screen they are being sent away
    // from. It was also the one row of §1's table with nothing behind it.
    expect(document.title).toBe("Affordo — Audit: Life/Cost");
  });
});

describe("Router — the hydration gate is legible (#132)", () => {
  it("paints the loading line with a foreground token, not a surface one", () => {
    navigateTo("/");
    render(<Router navigate={vi.fn()} />);

    // `text-muted` is a surface token and rendered this line at ~1.15:1 in both
    // themes. A class assertion under PR #94's narrow exemption: the colour *is*
    // the criterion, and jsdom applies no stylesheet, so the class is the only
    // observable. `contrast.test.ts` proves the token is unusable as text; this
    // proves nothing uses it here.
    const line = screen.getByText(/loading/i);
    expect(line).toHaveClass("text-muted-foreground");
    // `(?!-)` matters: `-` is a word boundary, so `/\btext-muted\b/` matches
    // inside `text-muted-foreground` and the assertion would fail on correct
    // code. Same trap as the quote-sensitive `manifest` assertion in #128.
    expect(line.className).not.toMatch(/\btext-muted(?!-)/);
  });
});
