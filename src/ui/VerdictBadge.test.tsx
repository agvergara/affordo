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
