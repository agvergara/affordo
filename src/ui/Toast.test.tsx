// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./Toast";

/** A tiny consumer that raises a toast when its button is clicked. */
function Raiser({ message }: { message: string }) {
  const { toast } = useToast();
  return <button onClick={() => toast(message)}>raise</button>;
}

describe("Toast", () => {
  it("renders a raised toast's text", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Raiser message="Saved" />
      </ToastProvider>,
    );

    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "raise" }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("mounts a top-center notifications region styled to the tokens", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Raiser message="Saved" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "raise" }));

    // The region positions its toasts at the top-center of the viewport.
    const region = screen.getByRole("region", { name: /notifications/i });
    expect(region).toHaveClass("fixed", "inset-x-0", "top-4", "items-center");

    // Each toast maps bg/text/border/shadow to the reference tokens.
    const toast = screen.getByText("Saved");
    expect(toast).toHaveClass(
      "bg-background",
      "text-foreground",
      "border-border",
      "shadow-lg",
    );
  });

  it("shows every toast raised, in order", async () => {
    const user = userEvent.setup();
    function TwoRaisers() {
      const { toast } = useToast();
      return (
        <>
          <button onClick={() => toast("First")}>a</button>
          <button onClick={() => toast("Second")}>b</button>
        </>
      );
    }
    render(
      <ToastProvider>
        <TwoRaisers />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "a" }));
    await user.click(screen.getByRole("button", { name: "b" }));

    const statuses = screen.getAllByRole("status");
    expect(statuses.map((s) => s.textContent)).toEqual(["First", "Second"]);
  });

  it("throws when useToast is used outside a ToastProvider", () => {
    function Orphan() {
      useToast();
      return null;
    }
    // React logs the caught error; the assertion below is what matters.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow(
      /useToast must be used within a ToastProvider/,
    );
    spy.mockRestore();
  });
});
