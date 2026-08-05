import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * Inject a synchronous inline script that sets `document.title` from the path
 * before the parser reaches `<body>` (#129).
 *
 * `index.html` loads `main.tsx` as a module script, which is deferred by spec,
 * so the tab holds the root title until React boots. Navigation is
 * `window.location.replace` (ADR 0018), so that happens on *every* navigation,
 * not only the first. Measured on the built app: 56.5ms warm on localhost,
 * 89.9ms at 6x CPU throttle, and **1926.5ms** at 400ms RTT / 400kbps — long
 * enough to read the wrong title, not a flash someone might catch.
 *
 * A synchronous script closes it to 0.1-0.4ms.
 *
 * The map is generated from `ROUTE_HEADS` at build time rather than written
 * into `index.html`, so there is no second copy to drift. `documentHead.ts`
 * stays the runtime source of truth; this is a first-paint optimisation, not a
 * second router.
 *
 * Only the title is inlined. `description` and `og:*` are pointless here: their
 * consumers either run no JavaScript at all (unfurlers — see ADR 0018 and #125)
 * or run the app fully and get the real values from the router.
 */
export function inlineTitleScript(): Plugin {
  return {
    name: "affordo:inline-title",
    // `transformIndexHtml` runs for dev and build alike, so the dev server
    // behaves like production rather than hiding the window until someone
    // profiles a real build.
    transformIndexHtml(html) {
      const titles = readRouteTitles();
      const script =
        `<script>(function(){var t=${JSON.stringify(titles)};` +
        `var h=t[location.pathname.replace(/\\/+$/,"")||"/"];` +
        `if(h)document.title=h})();</script>`;

      const anchor = "</title>";
      if (!html.includes(anchor)) {
        throw new Error(
          "affordo:inline-title — index.html has no </title> to anchor to. " +
            "The script must follow the real <title>: placing it earlier works " +
            "only because setting document.title on a titleless document " +
            "creates one, leaving two <title> elements in the document.",
        );
      }
      return html.replace(anchor, `${anchor}\n    ${script}`);
    },
  };
}

/**
 * The path→title map, read out of `documentHead.ts` at build time.
 *
 * Parsed from source rather than imported: this file is loaded by Vite's Node
 * config pipeline, and importing a `.ts` module from there means either a
 * second transform step or a runtime that understands TypeScript. The parse is
 * narrow and, crucially, **throws rather than returning an empty map** — an
 * empty map would silently restore the whole window this plugin exists to
 * close, and every test here would still pass.
 */
function readRouteTitles(): Record<string, string> {
  const file = resolve(process.cwd(), "src/ui/documentHead.ts");
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch (cause) {
    throw new Error(
      `affordo:inline-title — cannot read ${file}. The route titles are ` +
        "generated from it at build time; without it the inline script would " +
        "ship an empty map and silently reopen the title window (#129).",
      { cause },
    );
  }

  const titles: Record<string, string> = {};

  const rootTitle = /ROOT_HEAD[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"/.exec(
    source,
  );
  if (!rootTitle?.[1]) {
    throw new Error(
      "affordo:inline-title — no title found in ROOT_HEAD. " +
        "Either documentHead.ts changed shape or the export was renamed.",
    );
  }
  titles["/"] = unescapeJs(rootTitle[1]);

  const table = /ROUTE_HEADS[^{]*\{([\s\S]*?)\n\};/.exec(source);
  if (!table?.[1]) {
    throw new Error(
      "affordo:inline-title — could not locate the ROUTE_HEADS object. " +
        "Either documentHead.ts changed shape or the export was renamed.",
    );
  }
  const entry = /"([^"]+)":\s*\{[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"/g;
  for (const m of table[1].matchAll(entry)) {
    titles[m[1] as string] = unescapeJs(m[2] as string);
  }

  if (Object.keys(titles).length < 2) {
    throw new Error(
      `affordo:inline-title — parsed only ${Object.keys(titles).length} title(s) ` +
        "from documentHead.ts. That is fewer than the routes it declares, so " +
        "the parse is wrong rather than the file being empty.",
    );
  }
  return titles;
}

/** Undo the source-level escaping of a double-quoted TypeScript string. */
function unescapeJs(raw: string): string {
  return raw.replace(/\\(.)/g, (_, c: string) =>
    c === "n" ? "\n" : c === "t" ? "\t" : c,
  );
}
