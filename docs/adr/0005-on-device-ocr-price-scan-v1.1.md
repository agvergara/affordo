# Price-tag scanning is on-device OCR only, shipped in v1.1

The mobile web version will let users scan a price tag with the camera to fill in
the purchase price, with a mandatory editable fallback (the OCR result is always
correctable, and manual entry is the desktop path). OCR runs **on-device** in the
browser (e.g. Tesseract.js/WASM or the browser Text Detection API); cloud OCR
(Google Vision, Textract) is rejected because it would reintroduce a backend to
custody API keys and would ship the photo off-device, contradicting ADR 0004's
privacy/no-backend stance. On-device OCR of real price tags is unreliable, so the
editable fallback is load-bearing, not cosmetic. The scan is deferred to **v1.1**:
manual price entry already exists (desktop path + scan fallback), so v1 ships
without the camera. Price parsing must handle European formatting — decimal comma
with dot thousands separators (e.g. `1.234,56 €`).
