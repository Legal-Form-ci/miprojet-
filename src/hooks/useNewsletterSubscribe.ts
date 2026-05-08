import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useNewsletterSubscribe(source: string = "article") {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const subscribe = useCallback(
    async (email: string) => {
      const trimmed = (email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast({
          title: "Adresse invalide",
          description: "Merci d'entrer une adresse e-mail valide.",
          variant: "destructive",
        });
        return false;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase
          .from("newsletter_subscribers" as any)
          .insert({ email: trimmed, source });
        if (error && !/duplicate|unique/i.test(error.message)) throw error;
        // Fire welcome email (non-blocking — don't fail the UX if email is slow)
        supabase.functions
          .invoke("welcome-newsletter", { body: { email: trimmed, source } })
          .catch((e) => console.warn("welcome-newsletter invoke failed:", e?.message));
        toast({
          title: "✅ Inscription confirmée",
          description: "Un e-mail de bienvenue vient de vous être envoyé.",
        });
        return true;
      } catch (e: any) {
        toast({
          title: "Inscription impossible",
          description: e?.message || "Réessayez dans un instant.",
          variant: "destructive",
        });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [source, toast],
  );

  return { subscribe, submitting };
}