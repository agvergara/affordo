import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { AffordoWorld, SEEDED_PROFILE } from "../support/world";

/**
 * Step definitions for the BDD suite.
 *
 * These read the app the way a user does — by role and visible text — rather
 * than by test id, so a scenario stays true if the markup is restructured. The
 * exceptions are the two counters the dashboard renders as chrome
 * (`saved-goals-divider`, `goals-list`), which have no accessible role of their
 * own.
 *
 * They deliberately do NOT assert geometry, colour or class strings. That is
 * `e2e/`'s job — see `AGENTS.md` rule 3. A feature file describes behaviour a
 * stakeholder can confirm; a pixel is not that.
 */

// ---------------------------------------------------------------- given

Given("I have never used Affordo", async function (this: AffordoWorld) {
  // Nothing to do: a fresh context has empty localStorage. Present as a step so
  // the precondition is stated in the feature rather than assumed by omission.
});

Given("I have a saved profile", async function (this: AffordoWorld) {
  await this.seed("affordo.profile", SEEDED_PROFILE);
});

Given(
  "my savings are {int}",
  async function (this: AffordoWorld, savings: number) {
    await this.page.evaluate((amount) => {
      const raw = window.localStorage.getItem("affordo.profile");
      const parsed = JSON.parse(raw ?? "{}");
      parsed.profile.savings = amount;
      window.localStorage.setItem("affordo.profile", JSON.stringify(parsed));
    }, savings);
    await this.page.reload();
  },
);

Given(
  "I have a goal {string} priced {int}",
  async function (this: AffordoWorld, name: string, price: number) {
    await addGoal(this, name, price);
  },
);

Given(
  "I have a goal {string} created on 15 January 2020",
  async function (this: AffordoWorld, name: string) {
    // Seeded rather than created through the UI: the card renders day
    // granularity, so a goal made seconds ago proves nothing about whether an
    // edit restamps it (#105).
    await this.page.evaluate((goalName) => {
      window.localStorage.setItem(
        "affordo.goals",
        JSON.stringify({
          schemaVersion: 1,
          goals: [
            {
              id: "seeded-1",
              name: goalName,
              price: 20000,
              note: "",
              createdAt: Date.UTC(2020, 0, 15, 12),
            },
          ],
        }),
      );
    }, name);
    await this.page.reload();
  },
);

Given("I am on the settings screen", async function (this: AffordoWorld) {
  await this.page.goto("/settings");
  await expect(
    this.page.getByRole("heading", { name: "Settings" }),
  ).toBeVisible();
});

// ---------------------------------------------------------------- when

// One definition per phrase: Cucumber matches on the text alone, so the same
// wording under `Given` and `When` is ambiguous rather than two variants.
When("I open the app", async function (this: AffordoWorld) {
  await this.page.goto("/");
});

When("I press {string}", async function (this: AffordoWorld, label: string) {
  await this.page.getByRole("button", { name: label }).click();
});

When("I enter my income details", async function (this: AffordoWorld) {
  await this.page.getByLabel("Net monthly salary").fill("2000");
  await this.page.getByLabel("Hours per week").fill("40");
  await this.page.getByLabel("Hours per day").fill("8");
  await this.page.getByLabel("Payments per year").fill("12");
});

When("I complete the onboarding wizard", async function (this: AffordoWorld) {
  await this.page.goto("/onboarding");
  await this.page.getByRole("button", { name: "Start →" }).click();
  await this.page.getByLabel("Net monthly salary").fill("2000");
  await this.page.getByLabel("Hours per week").fill("40");
  await this.page.getByLabel("Hours per day").fill("8");
  await this.page.getByLabel("Payments per year").fill("12");
  // Walk the remaining steps by whichever forward control the step offers.
  for (;;) {
    const finish = this.page.getByRole("button", { name: /Finish/ });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      break;
    }
    await this.page.getByRole("button", { name: /Continue/ }).click();
  }
});

When(
  "I add a goal {string} priced {int}",
  async function (this: AffordoWorld, name: string, price: number) {
    await addGoal(this, name, price);
  },
);

When(
  "I rename it to {string} and reprice it to {int}",
  async function (this: AffordoWorld, name: string, price: number) {
    await this.page.getByRole("button", { name: "Edit" }).first().click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await this.page.getByLabel("Name").fill(name);
    await this.page.getByLabel("Price").fill(String(price));
    await this.page.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
  },
);

When("I remove it", async function (this: AffordoWorld) {
  await this.page.getByRole("button", { name: "Remove" }).first().click();
});

When("I reload the page", async function (this: AffordoWorld) {
  await this.page.reload();
});

When(
  "I change my salary to {int}",
  async function (this: AffordoWorld, salary: number) {
    await this.page.getByLabel("Net monthly salary").fill(String(salary));
  },
);

When("I am on my goals dashboard", async function (this: AffordoWorld) {
  await this.page.goto("/goals");
  await expect(this.page.getByRole("heading", { name: "Goals" })).toBeVisible();
});

When(
  "I press {string} and decline the confirmation",
  async function (this: AffordoWorld, label: string) {
    this.page.once("dialog", (d) => void d.dismiss());
    await this.page
      .getByRole("button", { name: label })
      .click({ noWaitAfter: true });
  },
);

When(
  "I press {string} and accept the confirmation",
  async function (this: AffordoWorld, label: string) {
    // `noWaitAfter`: accepting navigates via `location.replace`, and the
    // default click waits for a post-click stability that never arrives.
    this.page.once("dialog", (d) => void d.accept());
    await this.page
      .getByRole("button", { name: label })
      .click({ noWaitAfter: true });
  },
);

// ---------------------------------------------------------------- then

Then(
  "I am taken to {string}",
  async function (this: AffordoWorld, path: string) {
    await this.page.waitForURL(`**${path}`);
    expect(new URL(this.page.url()).pathname).toBe(path);
  },
);

Then(
  "I see {string} in the browser tab",
  async function (this: AffordoWorld, title: string) {
    await expect(this.page).toHaveTitle(title);
  },
);

Then(
  "the primary action reads {string}",
  async function (this: AffordoWorld, label: string) {
    await expect(this.page.getByRole("button", { name: label })).toBeVisible();
  },
);

Then("I cannot go back", async function (this: AffordoWorld) {
  await expect(this.page.getByRole("button", { name: /Back/ })).toBeDisabled();
});

Then("I cannot continue", async function (this: AffordoWorld) {
  await expect(
    this.page.getByRole("button", { name: /Continue|Finish/ }),
  ).toBeDisabled();
});

Then("I can continue", async function (this: AffordoWorld) {
  await expect(
    this.page.getByRole("button", { name: /Continue|Finish/ }),
  ).toBeEnabled();
});

Then("my profile is saved", async function (this: AffordoWorld) {
  const stored = await this.page.evaluate(() =>
    window.localStorage.getItem("affordo.profile"),
  );
  expect(stored, "expected a profile in localStorage").toBeTruthy();
});

Then(
  "Affordo no longer considers me set up",
  async function (this: AffordoWorld) {
    // Asserted as behaviour, not as storage. `clearProfile` writes a zeroed
    // `defaultProfile` back rather than removing the key, so a scenario that
    // demanded the key be absent would fail against a correct app. What the
    // user experiences is the guard: salary 0 means not set up, which is why
    // the step above lands on /onboarding.
    const salary = await this.page.evaluate(() => {
      const raw = window.localStorage.getItem("affordo.profile");
      return raw ? (JSON.parse(raw).profile?.salary ?? null) : null;
    });
    expect(salary === null || salary === 0).toBe(true);
  },
);

Then("no goals are saved", async function (this: AffordoWorld) {
  const stored = await this.page.evaluate(() =>
    window.localStorage.getItem("affordo.goals"),
  );
  expect(stored ?? "").not.toContain("Laptop");
});

Then("I see {string}", async function (this: AffordoWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible();
});

Then(
  "the saved-goals count reads {int}",
  async function (this: AffordoWorld, count: number) {
    await expect(this.page.getByTestId("saved-goals-divider")).toHaveText(
      `Saved goals · ${count}`,
    );
  },
);

Then(
  "I see a goal named {string}",
  async function (this: AffordoWorld, name: string) {
    await expect(this.page.getByTestId("goals-list")).toContainText(name);
  },
);

Then(
  "I do not see a goal named {string}",
  async function (this: AffordoWorld, name: string) {
    await expect(this.page.getByTestId("goals-list")).not.toContainText(name);
  },
);

Then(
  "the goal {string} shows the verdict {string}",
  async function (this: AffordoWorld, name: string, verdict: string) {
    const card = this.page.getByRole("article").filter({ hasText: name });
    await expect(card).toContainText(verdict);
  },
);

Then(
  "the goal still shows its 2020 creation date",
  async function (this: AffordoWorld) {
    await expect(this.page.getByTestId("goals-list")).toContainText("2020");
  },
);

Then(
  "the goal is still gone after a reload",
  async function (this: AffordoWorld) {
    await this.page.reload();
    await expect(
      this.page.getByText("No decisions to reckon with yet."),
    ).toBeVisible();
  },
);

Then(
  "my salary is still {int}",
  async function (this: AffordoWorld, salary: number) {
    await expect(this.page.getByLabel("Net monthly salary")).toHaveValue(
      String(salary),
    );
  },
);

Then(
  "my salary is {int} after a reload",
  async function (this: AffordoWorld, salary: number) {
    await this.page.reload();
    await expect(this.page.getByLabel("Net monthly salary")).toHaveValue(
      String(salary),
    );
  },
);

Then("I see a confirmation", async function (this: AffordoWorld) {
  await expect(this.page.getByRole("status")).toBeVisible();
});

Then("I am still on the settings screen", async function (this: AffordoWorld) {
  expect(new URL(this.page.url()).pathname).toBe("/settings");
});

// ------------------------------------------------- the comparison (#155)

// Deliberately worded as the user experiences it. "The goal is not in the
// plan", never "share is null"; "already paid for", never "months === 0".
// The mechanism is `e2e/`'s and the unit suite's business — see AGENTS.md.

When("I open the comparison", async function (this: AffordoWorld) {
  await this.page.goto("/compare");
  await expect(
    this.page.getByRole("heading", { name: "Compare" }),
  ).toBeVisible();
});

When(
  "I assign {int} a month to {string}",
  async function (this: AffordoWorld, amount: number, name: string) {
    await shareRow(this, name)
      .getByLabel(/monthly share/i)
      .fill(String(amount));
  },
);

When(
  "I take {string} back out of the plan",
  async function (this: AffordoWorld, name: string) {
    await shareRow(this, name).getByRole("button", { name: /clear/i }).click();
  },
);

When("I come back later", async function (this: AffordoWorld) {
  // A reload, not a re-render: the point is that the split outlived the tab.
  await this.page.reload();
});

When("I go back to my goals dashboard", async function (this: AffordoWorld) {
  await this.page.goto("/goals");
});

Then(
  "the goal {string} takes {int} months",
  async function (this: AffordoWorld, name: string, months: number) {
    await expect(shareRow(this, name)).toContainText(`${months} months`);
  },
);

Then(
  "the goal {string} is not in the plan",
  async function (this: AffordoWorld, name: string) {
    await expect(shareRow(this, name)).toContainText("not assigned");
  },
);

Then(
  "the goal {string} is already paid for",
  async function (this: AffordoWorld, name: string) {
    await expect(shareRow(this, name)).toContainText("Funded now");
  },
);

Then(
  "Affordo tells me {string} is later than it would be on its own",
  async function (this: AffordoWorld, name: string) {
    await expect(shareRow(this, name)).toContainText("vs. alone");
  },
);

Then(
  "Affordo does not say {string} is held up",
  async function (this: AffordoWorld, name: string) {
    await expect(shareRow(this, name)).not.toContainText("vs. alone");
  },
);

Then(
  "Affordo says I have assigned {int} a month",
  async function (this: AffordoWorld, amount: number) {
    await expect(this.page.getByTestId("compare-assigned")).toContainText(
      String(amount),
    );
  },
);

Then(
  "I still have a goal named {string}",
  async function (this: AffordoWorld, name: string) {
    await expect(this.page.getByTestId("compare-list")).toContainText(name);
  },
);

Given(
  "my monthly expenses leave me {int} a month",
  async function (this: AffordoWorld, surplus: number) {
    await setProfileField(
      this,
      "expenses",
      SEEDED_PROFILE.profile.salary - surplus,
    );
  },
);

Given("my expenses meet my income", async function (this: AffordoWorld) {
  await setProfileField(this, "expenses", SEEDED_PROFILE.profile.salary);
});

Then(
  "Affordo warns me the plan needs money I do not have",
  async function (this: AffordoWorld) {
    await expect(this.page.getByTestId("compare-overdrawn")).toContainText(
      "more than you have",
    );
  },
);

Then(
  "Affordo tells me there is no monthly surplus to share",
  async function (this: AffordoWorld) {
    await expect(this.page.getByTestId("compare-no-surplus")).toContainText(
      "No monthly surplus to share",
    );
  },
);

Then(
  "the goal {string} cannot be reached",
  async function (this: AffordoWorld, name: string) {
    await expect(shareRow(this, name)).toContainText("unreachable");
  },
);

// ---------------------------------------------------------------- helpers

/** Rewrite one profile field in place, then reload so the app re-reads it. */
async function setProfileField(
  world: AffordoWorld,
  field: string,
  value: number,
): Promise<void> {
  await world.page.evaluate(
    ([key, amount]) => {
      const raw = window.localStorage.getItem("affordo.profile");
      const parsed = JSON.parse(raw ?? "{}");
      parsed.profile[key as string] = amount;
      window.localStorage.setItem("affordo.profile", JSON.stringify(parsed));
    },
    [field, value] as const,
  );
  await world.page.reload();
}

/** The comparison row for a named goal. */
function shareRow(world: AffordoWorld, name: string) {
  return world.page.getByTestId("compare-item").filter({ hasText: name });
}

/** Add a goal through the dialog, as a user would. */
async function addGoal(
  world: AffordoWorld,
  name: string,
  price: number,
): Promise<void> {
  if (new URL(world.page.url()).pathname !== "/goals") {
    await world.page.goto("/goals");
  }
  await world.page.getByRole("button", { name: /Add goal/ }).click();
  const dialog = world.page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await world.page.getByLabel("Name").fill(name);
  await world.page.getByLabel("Price").fill(String(price));
  await world.page.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
}
