// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
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
});
