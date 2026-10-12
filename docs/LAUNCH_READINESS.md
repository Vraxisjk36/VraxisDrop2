# Vraxis Drop V2 — launch readiness
Updated: 12 October 2026

## Implemented
- GitHub Pages frontend: Quick Drop, retrieval, Connect, plans and optional account.
- Quick Drop: server-side 10 MB/file, 100 KB text, 6 sends/hour/IP, 30 pickups/hour/IP, 1h or 24h expiry.
- Connect: WebRTC with STUN, browser-enforced 50 MB/file; connectivity is not guaranteed on every network.
- Signed Lemon Squeezy webhook handling with timestamp-ordered subscription-state updates.
- Optional email authentication and pending purchase lookup; premium access deliberately disabled.
- Draft privacy and terms pages, linked from site navigation.
- Static CI preflight workflow for JS syntax and local page references.

## Must finish before commercial paid launch
1. Test provider webhooks and reconcile events arriving before creation, renewals, refunds, chargebacks, cancellations and retries.
2. Securely map checkout to a verified user and activate paid entitlements; billing-status currently disables paid access.
3. Build server-enforced premium Quick Drop quota and multi-file/chunked upload architecture; current Supabase Free file cap is 50 MB.
4. Build tier-aware Connect limits and assess TURN relay for dependable cross-network connection.
5. Verify Auth redirect allowlist, email delivery, account recovery, monitoring, storage cleanup and budget alerts.
6. Confirm merchant pricing/currency and complete business identity, contact, POPIA/privacy and consumer/refund legal review.
7. Test concurrent pickup, interrupted downloads, encryption, mobile browsers, expiry and rate limits; inspect CI results.

## Current go/no-go
GO only for a clearly labelled free beta after manual device tests. NO-GO for accepting payments or advertising paid limits. Do not touch V1 repository Vraxisjk36/vraxis-.