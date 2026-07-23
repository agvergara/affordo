// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

beforeEach(() => window.localStorage.clear());

describe("App — stage 1 Time Cost", () => {
  it("shows the Time Cost once price and income are entered", async () => {
    const user = userEvent.setup();
    render(<App />);

    // €1300/mo net at the default 40h/wk → €7.50/h.
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    // €240 at €7.50/h = 32 work-hours = 4 work days (8h/day).
    await user.type(screen.getByLabelText(/price/i), "240,00");

    expect(screen.getByTestId("time-cost")).toHaveTextContent(/4 work days/i);
  });

  it("shows the hourly wage in the selected currency symbol", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    expect(screen.getByTestId("hourly-wage")).toHaveTextContent("€7,50");

    await user.selectOptions(screen.getByLabelText(/currency/i), "GBP");
    expect(screen.getByTestId("hourly-wage")).toHaveTextContent("£7,50");
  });

  it("advises the user of European number formatting", () => {
    render(<App />);
    expect(screen.getByText(/1\.234,56/)).toBeInTheDocument();
  });

  it("reassures the user that data never leaves the browser", () => {
    render(<App />);
    expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument();
  });

  it("shows no wage when hours per week is cleared to zero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.clear(screen.getByLabelText(/hours per week/i));
    expect(screen.queryByTestId("hourly-wage")).toBeNull();
  });

  it("shows no Time Cost for a non-positive price", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");

    await user.type(screen.getByLabelText(/price/i), "-50,00");
    expect(screen.queryByTestId("time-cost")).toBeNull();

    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), "0,00");
    expect(screen.queryByTestId("time-cost")).toBeNull();
  });

  it("says you can afford it now when savings cover the price", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    await user.type(screen.getByLabelText(/current savings/i), "500,00");
    expect(screen.getByTestId("verdict")).toHaveTextContent(/afford this right now/i);
  });

  it("says not yet when savings fall short of the price", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/price/i), "240,00");
    await user.type(screen.getByLabelText(/current savings/i), "100,00");
    expect(screen.getByTestId("verdict")).toHaveTextContent(/not yet/i);
  });

  it("restores the saved profile after the app is reopened", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText(/monthly net income/i), "1.300,00");
    await user.type(screen.getByLabelText(/current savings/i), "500,00");
    await user.selectOptions(screen.getByLabelText(/currency/i), "GBP");
    first.unmount();

    render(<App />);
    expect(screen.getByLabelText(/monthly net income/i)).toHaveValue("1.300,00");
    expect(screen.getByLabelText(/current savings/i)).toHaveValue("500,00");
    expect(screen.getByLabelText(/currency/i)).toHaveValue("GBP");
  });
});
