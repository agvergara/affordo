import {
  setWorldConstructor,
  World,
  type IWorldOptions,
} from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "@playwright/test";

/** Where the built app is served during a BDD run. */
export const BASE_URL = "http://localhost:4174";

/**
 * The profile the app needs before `/goals` and `/settings` will let you in.
 * Steps seed this rather than clicking through onboarding, except in the
 * onboarding feature itself, which is about that flow.
 */
export const SEEDED_PROFILE = {
  schemaVersion: 1,
  profile: {
    currency: "EUR",
    salary: 2000,
    hoursPerWeek: 40,
    hoursPerDay: 8,
    paymentsPerYear: 12,
    expenses: 500,
    threshold: 10,
    savings: 0,
    monthlyContribution: 0,
  },
};

/**
 * One browser context per scenario, so `localStorage` never leaks between them.
 *
 * The app is entirely `localStorage`-backed, so a shared context would make
 * scenarios order-dependent in exactly the way that is hardest to debug: a
 * profile saved by scenario 3 would silently satisfy the guard in scenario 7.
 */
export class AffordoWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Seed `localStorage` before any app code runs on the next navigation. */
  async seed(key: string, value: unknown): Promise<void> {
    await this.context.addInitScript(
      ([k, v]) => {
        // Guarded: `addInitScript` fires on every navigation, so an unguarded
        // seed would overwrite what a scenario just did whenever it reloads.
        if (window.localStorage.getItem(k as string)) return;
        window.localStorage.setItem(k as string, v as string);
      },
      [key, JSON.stringify(value)],
    );
  }
}

setWorldConstructor(AffordoWorld);
