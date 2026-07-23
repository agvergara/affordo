# v1 is a client-only TypeScript SPA with no backend

Affordo v1 runs entirely in the browser as a TypeScript single-page app served
as a static bundle (e.g. S3 + CloudFront). There is no backend: the affordability
and time-cost engine is pure arithmetic on the user's own inputs, with no
secrets, shared state, or database. This is driven by the privacy principle that
the user's salary must never leave their device — so computation happens
in-browser and session persistence uses client-side storage (localStorage,
encrypted if desired), never a network round-trip. We explicitly rejected an AWS
Lambda API for v1: sending the salary to a server to be computed would contradict
the privacy stance, and there is no server-side logic or secret to justify it.
A backend (Lambda/API) is expected later only when a real server-side need
appears — accounts, bank integration, or a shared engine for the future Android
app. The engine should be structured as a framework-agnostic TypeScript module so
it can be reused (e.g. by the Android app) without a server.
