import { requireAdmin } from "../_shared/requireAdmin.ts";
import { sendEmail, brandedEmailShell, corsHeaders } from "../_shared/resend.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { to, subject, html, preheader, ctaUrl, ctaLabel, raw } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ ok: false, error: "to, subject, html are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const finalHtml = raw ? html : brandedEmailShell({ innerHtml: html, preheader, ctaUrl, ctaLabel });
    const recipients: string[] = Array.isArray(to) ? to : [to];

    const results = [];
    for (const r of recipients) {
      const result = await sendEmail({ to: r, subject, html: finalHtml });
      await supabase.from("email_logs").insert({
        kind: "single",
        recipient_email: r,
        subject,
        status: result.ok ? "sent" : "failed",
        provider_id: result.id ?? null,
        error: result.error ?? null,
      });
      results.push({ to: r, ok: result.ok, id: result.id, error: result.error });
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});