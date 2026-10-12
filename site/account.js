import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const url = "https://hvidmmthnragwxcywppt.supabase.co";
const key = "sb_publishable_2lPMMrHLikazMrhnt7GN8Q_9r8gcwX7";
const supabase = createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
const $ = id => document.getElementById(id);
const status = (message, error = false) => { $("status").textContent = message; $("status").classList.toggle("error", error); };
async function showAccount() {
  const { data: { user }, error } = await supabase.auth.getUser();
  $("signed-out").classList.toggle("hidden", !!user);
  $("signed-in").classList.toggle("hidden", !user);
  if (!user) { if (error && error.name !== "AuthSessionMissingError") status("Please sign in to view your account.", true); return; }
  $("user-email").textContent = user.email || "Signed in";
  await refreshPlan();
}
async function refreshPlan() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch(url + "/functions/v1/billing-status", { headers: { authorization: "Bearer " + session.access_token, apikey: key } });
    if (!res.ok) throw new Error("Plan status unavailable");
    const data = await res.json();
    const heading = document.createElement("strong");
    heading.textContent = data.plan === "plus" ? "Vraxis Plus (recorded)" : data.plan === "drop_pass" ? "Drop Pass (recorded)" : data.pending_purchases ? "Purchase pending activation" : "Free";
    const note = document.createElement("p");
    note.textContent = data.pending_purchases ? data.pending_purchases + " linked purchase(s) awaiting activation. Paid transfers are not live yet." : "Paid transfer features are not live yet. No upgrades are available for purchase.";
    $("plan-summary").replaceChildren(heading, note);
  } catch { status("Signed in, but we couldn't load your plan. Try refreshing.", true); }
}
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("email").value.trim();
  const button = $("login-button");
  button.disabled = true;
  status("Sending your sign-in link…");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL("account.html", location.href).href, shouldCreateUser: true } });
  button.disabled = false;
  status(error ? "Could not send the link: " + error.message : "Check your email for your secure sign-in link.", !!error);
});
$("claim-button").addEventListener("click", async () => {
  const button = $("claim-button");
  button.disabled = true;
  status("Looking for purchases associated with your verified email…");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in again.");
    const res = await fetch(url + "/functions/v1/billing-claim", {
      method: "POST",
      headers: { authorization: "Bearer " + session.access_token, apikey: key, "content-type": "application/json" },
      body: "{}"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Purchase lookup unavailable.");
    status(data.linked ? data.linked + " purchase(s) linked to your account. Premium transfers are not enabled yet." : "No unlinked purchases found for this verified email.");
    await refreshPlan();
  } catch (error) {
    status(error instanceof Error ? error.message : "Could not check purchases.", true);
  } finally { button.disabled = false; }
});
$("refresh-button").addEventListener("click", () => { status(""); refreshPlan(); });
$("logout-button").addEventListener("click", async () => { const { error } = await supabase.auth.signOut(); status(error ? error.message : "You are signed out.", !!error); await showAccount(); });
supabase.auth.onAuthStateChange(() => { setTimeout(showAccount, 0); });
showAccount();
