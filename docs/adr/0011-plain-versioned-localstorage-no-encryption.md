# Persistence: plain versioned localStorage, no encryption in v1

The financial profile (income, hours, payments/year, itemized expenses, savings,
currency, threshold settings) and saved Goals are stored as plain JSON in
localStorage, same-origin only.

**No encryption in v1.** Encryption with an app-embedded key is security theater
— the key ships in the bundle, so device access defeats it — and passphrase
encryption fights the low-friction ethos (ADR 0006) and risks data loss. The real
protection is architectural (ADR 0004): the data never leaves the device. The UI
must communicate this as a trust signal — "your data is secure because it never
leaves your browser." Do NOT add embedded-key "encryption"; if real at-rest
security is ever wanted, add it properly as an optional user passphrase.

**Schema versioning is required.** Store a `schemaVersion` with the data so the
roadmap (v1.1/v1.2/v2 add fields) can migrate old saved data rather than break
it. This — not encryption — is the forward-looking safeguard.

**Durable/cross-device storage is deferred.** localStorage can be cleared by the
user or browser; portable, permanent storage (accounts, sync) is a separate later
question, likely arriving with the future backend.
