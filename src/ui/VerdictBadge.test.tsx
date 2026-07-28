// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictBadge } from "./VerdictBadge";

describe("VerdictBadge label", () => {
  it.each([
    ["afford", "Afford"],
    ["stretch", "Stretch"],
    ["cutToAfford", "Cut to afford"],
    ["cannot", "Cannot"],
  ] as const)("labels the %s verdict %s", (kind, label) => {
    render(<VerdictBadge kind={kind} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("VerdictBadge colour", () => {
  // The badge's colour IS the behaviour here — "the answer at a glance" (#60,
  // user story 36). A colour is only observable in jsdom through the utility
  // class that sets it, so this is the one place the card's tests name classes:
  // asserting the four kinds are visually distinct, per the reference palette.
  it.each([
    ["afford", "bg-emerald-600", "text-white"],
    ["stretch", "bg-foreground", "text-background"],
    ["cutToAfford", "bg-accent", "text-accent-foreground"],
    ["cannot", "bg-destructive", "text-destructive-foreground"],
  ] as const)("colours the %s verdict %s", (kind, background, foreground) => {
    const { container } = render(<VerdictBadge kind={kind} />);
    expect(container.firstChild).toHaveClass(background, foreground);
  });
});
