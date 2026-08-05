import {
  AfterAll,
  Before,
  After,
  BeforeAll,
  Status,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import { chromium, type Browser } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { AffordoWorld, BASE_URL } from "./world";

// Cucumber has no `timeout` config key — the default 5s is set in support code.
// Browser steps that build, navigate and assert need more than that.
setDefaultTimeout(30_000);

let browser: Browser;
let server: ChildProcess | undefined;

/** Poll until the preview server answers, or give up loudly. */
async function waitForServer(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      throw new Error(
        `BDD run: ${url} did not come up within ${timeoutMs}ms. ` +
          "The suite builds and serves the app itself; check `npm run build`.",
      );
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Build and serve the app once for the whole run.
 *
 * Port 4174, not Playwright's 4173, so a BDD run and an `npm run test:e2e` can
 * share a machine without one silently serving the other's build.
 *
 * These features assert on the built output on purpose: the inline title script
 * (#129) is a build-time transform and is invisible to a dev server.
 */
BeforeAll({ timeout: 180_000 }, async () => {
  server = spawn("npm", ["run", "build", "--silent"], {
    stdio: "inherit",
    shell: false,
  });
  await new Promise<void>((resolve, reject) => {
    server?.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`build failed (${code})`)),
    );
    server?.on("error", reject);
  });

  server = spawn("npx", ["vite", "preview", "--port", "4174", "--strictPort"], {
    stdio: "ignore",
    shell: false,
  });
  await waitForServer(BASE_URL);

  browser = await chromium.launch();
});

Before(async function (this: AffordoWorld) {
  this.browser = browser;
  this.context = await browser.newContext({ baseURL: BASE_URL });
  this.page = await this.context.newPage();
});

After(async function (this: AffordoWorld, { result }) {
  // A screenshot is the only useful artefact for a failed UI scenario; the
  // stack trace points at the step, not at what the user would have seen.
  if (result?.status === Status.FAILED && this.page) {
    const shot = await this.page.screenshot();
    this.attach(shot, "image/png");
  }
  await this.context?.close();
});

AfterAll(async () => {
  await browser?.close();
  server?.kill();
});
