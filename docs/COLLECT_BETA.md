# Vraxis Collect V1 — beta implementation

Implemented in V2 only, 12 October 2026. V1 repository remains untouched.

## Components
- site/collect.html + site/collect.js: owner dashboard, collection links, QR codes, anonymous upload form and file download actions.
- Supabase Edge Function collect v1 (verify_jwt:false to permit public uploads; owner actions validate the Supabase bearer token using auth.getUser).
- Private bucket vraxis-collect, collect_boxes and collect_uploads tables with RLS and revoked anon/authenticated grants.
- collect_commit_upload RPC atomically checks and commits 20 files / 50 MB total per collection.
- Owner verified email required; maximum 3 active collections; 7-day expiry; 10 MB/file.
- Per-IP server rate limiting, token-hash lookup, signed owner downloads expiring after 60 seconds.
- Paid checkout remains disabled.

## Important pre-launch limitations
- **NOT QA VERIFIED**: No live browser roundtrip or GitHub Actions green run has been confirmed.
- Anonymous upload endpoints need malware scanning, stronger abuse moderation and monitoring before broad promotion.
- Uploads are stored before quota commit; failed commits attempt cleanup. Test orphan recovery and concurrency.
- Cleanup is opportunistic, triggered by new collection creation; not a guaranteed timed deletion. Existing file objects can persist after expiry.
- Closing a collection blocks uploads but does not immediately delete submissions.
- QR generation uses an external CDN; verify it loads on mobile and supply fallback if blocked.
- Only one file per upload action. Senders can submit more until collection quota reached.
- Signed downloads must be tested with non-ASCII filenames and browser pop-up restrictions.
- Keep the feature labelled beta until full manual QA passes.

## Manual test matrix
1. Sign in with verified email; create a collection and copy link.
2. Open link in incognito/second phone; inspect title, upload a small file without sign-in.
3. Refresh owner dashboard; view submission and download bytes, verify original content.
4. Confirm non-owner cannot list/download via backend; invalid tokens rejected.
5. Confirm over-10 MB rejected, 20-file and 50 MB quotas, 3 active collection limit.
6. Close collection and confirm public upload rejected.
7. Test expired collection, multiple concurrent submissions, failed upload recovery and cleanup.
8. Verify mobile layout, QR scanning, navigation and GitHub Actions checks.
