import { sendEmail, brandedEmailShell, corsHeaders } from "../_shared/resend.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Public endpoint — no auth required.
 * Triggered when a visitor subscribes to the newsletter from the footer.
 * Sends the branded welcome email AND logs it.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { email, source } = await req.json();
    const e = (email ?? "").toString().toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inner = `
      <h1 style="color:#15803d;font-size:24px;margin:0 0 16px 0;">Bienvenue dans la communauté MIPROJET 🌍</h1>
      <p>Merci d'avoir rejoint notre newsletter. Vous recevrez en priorité :</p>
      <ul style="padding-left:20px;line-height:1.9;">
        <li>📈 Les <strong>opportunités de financement</strong> en Côte d'Ivoire et en Afrique</li>
        <li>🏗️ Les <strong>actualités</strong> de la structuration de projets</li>
        <li>🎓 Les <strong>guides et e-books</strong> exclusifs MIPROJET</li>
        <li>🤝 Les <strong>appels à projets</strong> et programmes d'incubation</li>
      </ul>
      <p style="margin-top:24px;">Pour aller plus loin, découvrez nos abonnements <strong>Premium</strong> et <strong>Elite</strong> qui débloquent les opportunités exclusives.</p>
    `;
    const html = brandedEmailShell({
      innerHtml: inner,
      preheader: "Vos opportunités africaines, directement dans votre boîte mail.",
      ctaUrl: "https://ivoireprojet.com/subscription",
      ctaLabel: "Découvrir nos abonnements",
    });

    const result = await sendEmail({
      to: e,
      subject: "Bienvenue dans MIPROJET 🌍",
      html,
      tags: [{ name: "kind", value: "newsletter_welcome" }, { name: "source", value: source ?? "footer" }],
    });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("email_logs").insert({
      kind: "newsletter_welcome",
      recipient_email: e,
      subject: "Bienvenue dans MIPROJET 🌍",
      status: result.ok ? "sent" : "failed",
      provider_id: result.id ?? null,
      error: result.error ?? null,
      metadata: { source: source ?? "footer" },
    });

    return new Response(JSON.stringify({ ok: result.ok, id: result.id, error: result.error }), {
      status: result.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});