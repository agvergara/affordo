# Web-first with React DOM + Vite; React Native deferred

v1 is built with React DOM + Vite, producing a static bundle (aligns with the
S3/CloudFront hosting in ADR 0004). We deliberately do NOT use React Native /
Expo + react-native-web now, despite the distant-future Android goal.

Rationale:
- The Android app is distant and uncertain; adopting react-native-web now would
  tax the web v1 (heavier, less-idiomatic web output, more awkward static
  hosting) to hedge a maybe.
- The valuable, correctness-critical reuse is the engine, already isolated as
  pure TypeScript (ADR 0008) — reusable by React Native or Kotlin untouched. UI
  reuse is the marginal extra.
- v1.1's on-device OCR is a browser technology (getUserMedia + Tesseract.js/WASM);
  a native RN app would use a different stack (ML Kit), so RN gives no "write
  once" for the one platform-specific feature.
- RN's value is native device access, which a privacy-first, client-only
  calculator does not need.

Revisit only when Android becomes a committed near-term deliverable; then choose
React Native (reusing the engine) or react-native-web deliberately, with more
information than we have today.
