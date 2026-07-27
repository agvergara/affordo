// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotFoundScreen } from "./Placeholder";

describe("NotFoundScreen", () => {
  it("shows the 404 numeral, Page not found, and a Go home link to /", () => {
    render(<NotFoundScreen />);

    expect(
      screen.getByRole("heading", { name: "404", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();

    const home = screen.getByRole("link", { name: "Go home" });
    expect(home).toHaveAttribute("href", "/");
  });
});
