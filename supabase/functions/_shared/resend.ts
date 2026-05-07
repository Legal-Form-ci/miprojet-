// Shared Resend helper.
// Sends transactional/marketing emails via the Resend HTTP API.
// RESEND_API_KEY must be set as a Supabase Edge Function secret.

const RESEND_URL = "https://api.resend.com/emails";

export const DEFAULT_FROM = Deno.env.get("RESEND_FROM") ?? "MIPROJET <noreply@ivoireprojet.com>";
export const DEFAULT_REPLY_TO = Deno.env.get("RESEND_REPLY_TO") ?? "contact@ivoireprojet.com";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
  text?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  status: number;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, status: 500, error: "RESEND_API_KEY not configured" };
  }
  const body = {
    from: input.from ?? DEFAULT_FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    reply_to: input.reply_to ?? DEFAULT_REPLY_TO,
    tags: input.tags,
  };
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep null */ }
    if (!res.ok) {
      return { ok: false, status: res.status, error: json?.message || text || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, id: json?.id };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

/**
 * Wraps inner HTML in the MIPROJET branded responsive shell.
 * Use for ALL outgoing emails so design is consistent.
 */
export function brandedEmailShell(opts: {
  innerHtml: string;
  preheader?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const { innerHtml, preheader = "", ctaUrl, ctaLabel } = opts;
  const cta = ctaUrl && ctaLabel
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;"><tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:10px;"><a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-weight:700;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;letter-spacing:0.3px;">${ctaLabel}</a></td></tr></table>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>MIPROJET</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
      <tr><td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 60%,#eab308 100%);padding:28px 32px;">
        <table width="100%"><tr>
          <td style="color:#ffffff;font-weight:800;font-size:22px;letter-spacing:0.5px;">MIPROJET</td>
          <td align="right" style="color:#ecfccb;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">ivoireprojet.com</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:36px 32px 8px 32px;font-size:15px;line-height:1.65;color:#1e293b;">
        ${innerHtml}
        ${cta}
      </td></tr>
      <tr><td style="padding:24px 32px 32px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
        Vous recevez cet email parce que vous êtes inscrit sur MIPROJET — la plateforme panafricaine de structuration de projets.<br/>
        © ${new Date().getFullYear()} MIPROJET · Abidjan, Côte d'Ivoire ·
        <a href="https://ivoireprojet.com" style="color:#16a34a;text-decoration:none;">ivoireprojet.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};