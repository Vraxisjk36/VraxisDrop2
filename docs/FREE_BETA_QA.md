# Vraxis Drop V2 — free beta acceptance test

Date: 12 October 2026
Scope: free public beta only. Paid checkout remains disabled. Never change V1.

## Automated preflight
- [ ] GitHub Actions V2 site preflight run is green after latest commit.
- [ ] GitHub Pages deploy is green; check the actual published page, not only repository files.
- [ ] Confirm privacy.html and terms.html resolve without 404.
- [ ] Confirm homepage, Retrieve, Connect, Plans and Account links work on mobile and desktop.

## Quick Drop
- [ ] Send short text, retrieve it on a second device, verify exact content.
- [ ] Retrieve the same code again: rejected.
- [ ] Upload and retrieve a small PDF/image; verify original filename and bytes.
- [ ] Test 10 MB accepted, greater than 10 MB rejected, text above 100 KB rejected.
- [ ] Test 1-hour and 24-hour expiry in controlled staging or clock-controlled tests.
- [ ] Verify concurrent pickup attempts do not both succeed.
- [ ] Test Private Mode link, encryption, tampered key and interrupted pickup; note that claim occurs before decryption and download.
- [ ] Verify send/pickup rate limits and error messages; never bypass limits on production just to test.

## Connect
- [ ] Phone-to-laptop text and image transfer on the same network.
- [ ] Repeat on different networks; STUN-only connectivity can fail.
- [ ] Host approval/denial, wrong code, expired room and disconnect.
- [ ] Multi-file transfer, SHA-256 mismatch detection and interrupted transfer.
- [ ] Confirm browser 50 MB/file limit; do not describe it as server-enforced.
- [ ] Safari on iPhone, Chrome on Android and desktop browser.

## Accounts and billing safety
- [ ] Free transfers require no login.
- [ ] Paid buttons remain absent from Plans.
- [ ] Account email sign-in works with configured Supabase redirect allowlist.
- [ ] Account page does not claim a paid plan is active.
- [ ] No secret API keys or service-role keys appear in public JS/HTML.

## Operations
- [ ] Confirm support/privacy contact, business identity and legal wording before broad promotion.
- [ ] Monitor Supabase usage, storage, rate limits and errors.
- [ ] Confirm file cleanup and retention disclosures.
- [ ] Check GitHub Pages, Edge Function and Supabase logs after controlled tests.

## Status
Repository-level edits have been committed, but end-to-end browser tests and GitHub Actions results are NOT yet verified. Do not mark launch QA complete until the checks above pass.
