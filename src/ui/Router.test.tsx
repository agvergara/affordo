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
      expect(screen.getByRole("heading", { name: /goals/i })).toBeInTheDocument(),
    );
    // The real dashboard mounts here (not the placeholder): its profile
    // snapshot is present.
    expect(screen.getByTestId("snapshot")).toBeInTheDocument();
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
});

describe("Router — unguarded routes", () => {
  it("renders the onboarding placeholder at /onboarding without a profile", () => {
    navigateTo("/onboarding");
    render(<Router navigate={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /onboarding/i }),
    ).toBeInTheDocument();
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
    render(<Router routes={{ "/onboarding": () => <Boom /> }} navigate={vi.fn()} />);

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
      <Router routes={{ "/onboarding": () => <Screen /> }} navigate={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
