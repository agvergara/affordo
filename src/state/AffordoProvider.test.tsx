// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AffordoProvider, useAffordo } from "./AffordoProvider";
import { defaultProfile, saveProfile } from "./profile-store";
import { saveGoals, type Goal } from "./goals-store";

beforeEach(() => window.localStorage.clear());

function Probe() {
  const { hydrated, profile, hasProfile, goals } = useAffordo();
  return (
    <div>
      <span data-testid="hydrated">{String(hydrated)}</span>
      <span data-testid="hasProfile">{String(hasProfile)}</span>
      <span data-testid="salary">{profile.salary}</span>
      <span data-testid="goal-count">{goals.length}</span>
    </div>
  );
}

describe("AffordoProvider hydration", () => {
  it("renders defaults with hydrated=false before the post-mount effect runs", () => {
    // Persist a real profile, then capture the value on the very first render
    // (before React flushes effects) — it must still be the un-hydrated default.
    saveProfile({ ...defaultProfile, salary: 9999 });
    let firstRender: { hydrated: boolean; salary: number } | undefined;
    function Capture() {
      const { hydrated, profile } = useAffordo();
      firstRender ??= { hydrated, salary: profile.salary };
      return null;
    }

    // Deliberately NOT wrapped in act(): we want the pre-effect snapshot.
    render(
      <AffordoProvider>
        <Capture />
      </AffordoProvider>,
    );

    expect(firstRender).toEqual({ hydrated: false, salary: 0 });
  });

  it("throws when useAffordo is called outside a provider", () => {
    function Orphan() {
      useAffordo();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/AffordoProvider/);
  });

  it("hydrates persisted profile and goals after mount", () => {
    saveProfile({ ...defaultProfile, salary: 2000 });
    const goals: Goal[] = [
      { id: "a", name: "MacBook", price: 2499, note: "", createdAt: 1 },
    ];
    saveGoals(goals);

    act(() => {
      render(
        <AffordoProvider>
          <Probe />
        </AffordoProvider>,
      );
    });

    // After act flushes the post-mount effect, storage is reflected.
    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
    expect(screen.getByTestId("salary")).toHaveTextContent("2000");
    expect(screen.getByTestId("goal-count")).toHaveTextContent("1");
  });

  it("derives hasProfile from salary > 0", () => {
    saveProfile({ ...defaultProfile, salary: 0 });
    act(() => {
      render(
        <AffordoProvider>
          <Probe />
        </AffordoProvider>,
      );
    });
    expect(screen.getByTestId("hasProfile")).toHaveTextContent("false");
  });

  it("has a profile once salary is above zero", () => {
    saveProfile({ ...defaultProfile, salary: 1500 });
    act(() => {
      render(
        <AffordoProvider>
          <Probe />
        </AffordoProvider>,
      );
    });
    expect(screen.getByTestId("hasProfile")).toHaveTextContent("true");
  });
});

function Editor() {
  const { profile, setProfile, clearProfile, goals, setGoals, clearGoals } =
    useAffordo();
  return (
    <div>
      <span data-testid="salary">{profile.salary}</span>
      <span data-testid="goal-count">{goals.length}</span>
      <button onClick={() => setProfile({ ...profile, salary: 4000 })}>
        set-profile
      </button>
      <button onClick={clearProfile}>clear-profile</button>
      <button
        onClick={() =>
          setGoals([
            { id: "x", name: "TV", price: 999, note: "", createdAt: 5 },
          ])
        }
      >
        set-goals
      </button>
      <button onClick={clearGoals}>clear-goals</button>
    </div>
  );
}

describe("AffordoProvider mutations persist", () => {
  it("setProfile updates state and persists to storage", async () => {
    const user = userEvent.setup();
    render(
      <AffordoProvider>
        <Editor />
      </AffordoProvider>,
    );

    await user.click(screen.getByText("set-profile"));
    expect(screen.getByTestId("salary")).toHaveTextContent("4000");

    const raw = JSON.parse(window.localStorage.getItem("affordo.profile")!);
    expect(raw.profile.salary).toBe(4000);
  });

  it("clearProfile resets to defaults", async () => {
    const user = userEvent.setup();
    render(
      <AffordoProvider>
        <Editor />
      </AffordoProvider>,
    );

    await user.click(screen.getByText("set-profile"));
    await user.click(screen.getByText("clear-profile"));
    expect(screen.getByTestId("salary")).toHaveTextContent(
      String(defaultProfile.salary),
    );
  });

  it("setGoals and clearGoals update state and persist", async () => {
    const user = userEvent.setup();
    render(
      <AffordoProvider>
        <Editor />
      </AffordoProvider>,
    );

    await user.click(screen.getByText("set-goals"));
    expect(screen.getByTestId("goal-count")).toHaveTextContent("1");
    expect(
      JSON.parse(window.localStorage.getItem("affordo.goals")!).goals,
    ).toHaveLength(1);

    await user.click(screen.getByText("clear-goals"));
    expect(screen.getByTestId("goal-count")).toHaveTextContent("0");
  });
});
