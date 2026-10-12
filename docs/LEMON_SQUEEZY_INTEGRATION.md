# Lemon Squeezy integration — implementation checklist

## Checkout products (public identifiers)
- Drop Pass: `5028ee49-7083-4d86-97c1-423f789ed2a3` — one-time, intended 7 days
- Plus: `eafd79a8-85d8-4082-8981-b38cf0feece1` — recurring
- Store: `vraxisweb`
- **Variant IDs confirmed by owner:** Drop Pass `2236353`, Plus `2236361`.

**Do not enable live checkout buttons yet.** Both Lemon Squeezy products are live but Vraxis Drop does not grant paid entitlements. Do not expose the Lemon Squeezy API key or webhook signing secret in GitHub Pages.

## Required before enabling checkout
1. Choose account identity and recovery (verified email / magic link). Never trust a customer email passed directly from the browser as proof of payment.
2. Configure Lemon Squeezy webhook destination in Supabase Edge Functions; set a **webhook signing secret** in Supabase secrets. Verify `X-Signature` against the exact raw request body with HMAC-SHA256 before processing. Reject requests if the secret is absent.
3. Map Lemon Squeezy **variant IDs** (not checkout URLs) to `drop_pass` and `plus`. Confirmed mapping: `2236353` → `drop_pass`, `2236361` → `plus`. Do not rely on product names or prices as identifiers.
4. Persist webhook event IDs/order IDs/subscription IDs for idempotency. Handle `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_failed` and renewal events according to documented semantics. Do not prematurely revoke prepaid subscription access on cancellation.
5. Store entitlements server-side, keyed to verified identity, with start/end timestamps. Drop Pass should expire seven days after confirmed payment. Reconcile events arriving out of order.
6. Enforce entitlements, Quick Drop per-file and monthly/7-day quotas **in the backend**, not just the UI. Current 10 MB server limit and one-file schema need redesign. Check Supabase upload size restrictions and large-file architecture before offering 100/500 MB.
7. Update Connect file size checks based on verified entitlements. Current browser-side 50 MB limit cannot be treated as an abuse/security boundary. Test large-file memory/backpressure, reconnects and cross-device behavior.
8. Test paid purchase, renewal, refund, expiration, webhook retry, duplicate delivery, forged signature, recovery on another device and quota exhaustion using test-mode products/events before exposing the live checkout URLs.

## Production rollout gate
Keep `site/plans.html` labeled **not for sale** until all above items pass. Never accept live payment for functionality that cannot yet be delivered. V1 repository `Vraxisjk36/vraxis-` must remain untouched.

## Implementation progress (2026-10-12)
- Private RLS-protected billing events, entitlements, and account-links tables created.
- `lemon-webhook` v3 stores signature-verified events and records matching order/subscription creations as `pending_identity` (not active).
- `billing-claim` v1 requires a verified Supabase Auth email and links matching pending purchases to the authenticated user as `pending_activation`; it does not grant premium features.
- `billing-status` v1 requires authentication and reports premium access disabled.
- Website sign-in and checkout activation, webhook renewal/refund/cancellation state machine, paid upload/storage limits, and end-to-end testing remain outstanding.
- Do not turn on live purchase CTAs until these are finished.
