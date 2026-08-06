# Vercel Web Analytics and Speed Insights, on a privacy-first app

Status: accepted (resolves issue #160).

## Context

Affordo's pitch is privacy, and [ADR 0011](0011-plain-versioned-localstorage-no-encryption.md)
makes that structural: everything lives in `localStorage`, there is no backend
([ADR 0004](0004-client-only-typescript-spa-no-backend.md)), and the app tells
the user so as a trust signal. `e2e/privacy.spec.ts` guarded the stance with an
absolute — no request to any origin but our own — and its comment listed what
that was meant to exclude: "no CDN fonts, **no analytics**, no bank connection."

Against that, nothing measures the shipped app. There is no way to know whether
anyone uses it, which routes they reach, or how it performs on real hardware.
The fidelity bar governs how the app _looks_, verified by browser measurement in
CI; how it _behaves_ for an actual user on an actual device is unmeasured. A
project whose whole discipline is "the unit suite is blind, so measure the real
thing" is measuring the real thing only up to the point it leaves a developer
machine.

## Decision

**Ship Vercel Web Analytics and Speed Insights, mounted once at the app root,
and narrow the privacy claim from "nothing leaves the browser" to "nothing
sensitive leaves the browser".**

The narrowing is the decision. It is defensible on two counts, and both are now
enforced rather than assumed:

- **The financial record still never leaves.** Profile and Goals stay in
  `localStorage`. The beacons carry page paths and performance timings — not
  salary, expenses, savings, goal names or prices. The shipped trust copy,
  _"Record persistent in local-cache"_, is a claim about storage and remains
  literally true; it is unchanged.
- **No third-party origin is introduced.** Both beacon to the deploying origin
  under `/_vercel/…`, so the original absolute — no foreign origin — survives
  intact.

They mount outside the root error boundary on purpose: the boundary swaps the
routed tree for a recovery screen, and a session that hit an error is the one
most worth measuring, so it must not be unmounted by the thing it is measuring.

## Consequences

**The privacy spec would have kept passing without being told.** It tested for
foreign origins; the beacons are same-origin. Every assertion in it would have
stayed green while the clause in its own comment — "no analytics" — became
false. That is precisely the failure mode
[the working agreements' rule 5](../../AGENTS.md) exists to catch: a test
advertising coverage it does not have. The comment is corrected in place, saying
what changed and why, rather than edited to look as though it always meant this.

The narrower promise therefore gets its own guard. A second test seeds a profile
and a goal with deliberately absurd figures, exercises the app, and asserts none
of those values appears in any outbound URL or request body. It also asserts a
`/_vercel/` request actually fires — without that, the test would pass equally
well with analytics removed entirely and would prove nothing about the case it
exists for.

The absurd figures are load-bearing, not whimsy. Realistic values (2000, 500)
collide with widths, timings and cache-busting integers, so the leak hunt would
fail for reasons unrelated to privacy.

**What is not covered:** this pins our own outbound traffic. It does not, and
cannot, verify what Vercel does with a page view once received; that rests on
their terms. Anyone uncomfortable with that boundary should reopen this ADR
rather than work around it — the mount point is one file, and removing it is a
two-line change.
