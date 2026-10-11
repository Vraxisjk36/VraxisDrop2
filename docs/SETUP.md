# Deploy Vraxis Drop V2

1. In GitHub repository Settings → Pages, select **GitHub Actions** as the build/deploy source.
2. In Supabase, create a new project. Run `docs/supabase-schema.sql` in the SQL editor.
3. Install Supabase CLI and authenticate. Deploy the function:
   `supabase functions deploy transfer --no-verify-jwt --project-ref YOUR_PROJECT_REF`
4. Configure Edge Function secret `TRANSFER_ORIGIN` to the exact website origin, for example `https://vraxisjk36.github.io` (no trailing slash).
5. Edit `site/config.js` to set `window.VRAXIS_TRANSFER_ENDPOINT` to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/transfer`.
6. GitHub Actions will publish the site. Check the deployment URL in the Pages workflow.

**Important before public release:** This scaffold does not yet implement shared rate limiting, abuse prevention, file scanning, or scheduled cleanup. Do not promote it as secure or production-ready. Server storage is not end-to-end encrypted. The service-role key must remain inside the Supabase Edge Function.
