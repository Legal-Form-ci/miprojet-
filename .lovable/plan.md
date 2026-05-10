# Plan — Refonte design MIPROJET + Système mailing professionnel complet

Demande très large couvrant 4 chantiers majeurs. Je propose une exécution par phases pour livrer du concret rapidement, puis itérer. Chaque phase est livrable indépendamment.

---

## Phase 1 — Fondations design & UI (priorité immédiate)

**Objectif** : corriger la refonte précédente (débordements, alignements, responsive, charte non cohérente avec le logo MiProjet vert/bleu).

- Reprendre `src/index.css` : tokens cohérents avec le logo MiProjet (bleu navy + vert + accents), oklch, ombres, gradients premium
- Auditer et corriger : `Hero`, `Navigation`, `Footer`, `Features`, `FundingTypes`, `HowItWorks`, `StatsSection`, `TestimonialsSection`, `CallToAction`
- Grille responsive cohérente (containers, paddings, breakpoints sm/md/lg/xl/2xl)
- Hiérarchie typographique pro (display + body, échelle modulaire)
- Newsletter footer : ajouter champ "Nom complet" en plus de l'email
- Vérification visuelle mobile / tablette / desktop

## Phase 2 — Refonte unifiée Email Marketing (admin)

**Objectif** : fusionner `AdminEmailMarketing` + `EmailTemplateManager` en un seul espace centralisé.

Nouveau composant `AdminMailingHub` avec onglets :
1. **Tableau de bord** (monitoring temps réel — voir Phase 3)
2. **Campagnes** (créer / éditer / envoyer / planifier)
3. **Templates** (bienvenue, paiement, opportunité, etc. — éditables)
4. **Automatisations** (mapping événement → template + segment)
5. **Segments & Abonnés** (newsletter + désabonnés)
6. **Logs & Événements** (livrés, ouverts, cliqués, bounces)

Le menu admin ne montre plus qu'**une seule entrée** "Email Marketing".

## Phase 3 — Monitoring temps réel mailing

Nouveau dashboard `AdminEmailMonitoring` :
- Quotas du jour Brevo (300) / Resend (100) avec barres de progression
- Total envoyés / livrés / ouverts / cliqués / bounces / plaintes (24h, 7j, 30j) — depuis `email_logs` + `email_events`
- Taux de délivrabilité, ouverture, clic
- Échecs récents avec détail erreur + bouton "Renvoyer"
- Statut campagnes en cours
- Stats par segment (newsletter, premium, elite, all_users)
- Désabonnements récents
- Provider actif / failover

Refresh auto via React Query (polling 15s).

## Phase 4 — Éditeur visuel WYSIWYG avancé pour campagnes

Remplacer l'éditeur HTML brut actuel par un éditeur visuel (basé sur **TipTap** déjà compatible React) :
- Génération IA initiale (`ai-generate-email`) → résultat injecté dans l'éditeur visuel
- Toolbar : titres, gras/italique, liens, listes, alignement, couleurs
- **Insertion d'images** par upload local (JPG/PNG/WEBP) → bucket Supabase Storage `email-assets` (public)
- **Insertion de boutons CTA** (composant inséré dans le HTML)
- **Insertion de documents** (PDF/Word/Excel/PPTX/CSV) → upload bucket `email-attachments`
- **Position image** (dropdown) : sous le logo / avant texte / milieu / après texte / pied
- **Position document** (dropdown) : bouton haut / milieu / bas / pièce jointe
- Preview live (desktop + mobile)
- Logo MiProjet **toujours injecté en en-tête** (Base64 fallback)

Composant : `src/components/admin/EmailVisualEditor.tsx` + bucket storage migration.

## Phase 5 — Templates emails pro (style Scoly)

Refonte du `brandedEmailShell` dans `supabase/functions/_shared/resend.ts` :
- Header : bandeau gradient bleu navy MiProjet + logo blanc centré (Base64)
- Tagline "Entrepreneuriat jeune"
- Salutation personnalisée `Bonjour {first_name} {last_name},`
- Corps : typographie pro, espaces généreux, CTA bouton large
- Footer : liens utiles + **lien désabonnement obligatoire** (token unique)
- Compatible Outlook / Gmail / Apple Mail (tables HTML)
- Headers propres (List-Unsubscribe, Reply-To)

Templates refondus : `welcome-newsletter`, `welcome-subscription`, `notify-new-opportunity`, + nouveaux : `payment-confirmation`, `subscription-expiring`, `subscription-renewed`, `password-reset`.

## Phase 6 — Désabonnement réel

- Migration : table `email_unsubscribes (email, token, reason, created_at)` + colonne `unsubscribe_token` sur `newsletter_subscribers`
- Edge function publique `unsubscribe` (GET avec token) → marque désabonné + page de confirmation
- Tous les envois vérifient la liste de désabonnement avant d'envoyer
- Header `List-Unsubscribe` automatique
- Page `/unsubscribe?token=...` côté frontend

## Phase 7 — Actualités & Opportunités → envoi auto

Dans `AdminNewsManager` et `AdminOpportunitiesManager` :
- Checkbox "Envoyer par email"
- Select "Segment destinataires" (newsletter / premium / elite / all_users)
- Upload image de couverture (déjà partiellement existant — vérifier)
- À la publication : déclencher `send-campaign` avec template visuel reprenant cover + titre + extrait + CTA "Lire la suite"

## Phase 8 — Automatisations événementielles

Vérifier / créer les triggers :
- Inscription newsletter → `welcome-newsletter` ✅ déjà OK
- Création compte → email de confirmation
- Paiement réussi (webhook FedaPay/Wave/Money Fusion) → `welcome-subscription` ✅ + `payment-confirmation`
- Nouvelle opportunité publiée → `notify-new-opportunity` (avec checkbox Phase 7)
- Cron quotidien : abonnements expirant dans 7j → `subscription-expiring`
- Cron quotidien : abonnements renouvelés → `subscription-renewed`
- Reset mot de passe (Supabase Auth) → template custom

## Phase 9 — Délivrabilité & anti-spam

- Optimisation HTML : tables, inline CSS, poids < 100KB
- Headers : `List-Unsubscribe`, `List-Unsubscribe-Post`, `Reply-To`, `Message-ID`
- Vérifier SPF/DKIM/DMARC (instructions OVH/Brevo/Resend)
- Texte alternatif (text/plain) auto-généré depuis HTML
- Tracking pixel optionnel
- Warm-up : limiter envois batch à 50/h sur nouveau domaine

---

## Détails techniques

```text
Nouveaux fichiers principaux:
  src/components/admin/AdminMailingHub.tsx            (hub unifié)
  src/components/admin/EmailMonitoringDashboard.tsx   (Phase 3)
  src/components/admin/EmailVisualEditor.tsx          (Phase 4 — TipTap)
  src/components/admin/EmailAutomationsManager.tsx    (Phase 8)
  src/pages/Unsubscribe.tsx                           (Phase 6)
  supabase/functions/unsubscribe/index.ts             (Phase 6)
  supabase/functions/payment-confirmation/index.ts    (Phase 8)
  supabase/functions/subscription-expiring/index.ts   (Phase 8)
  supabase/functions/_shared/branded-email.ts         (refonte shell)

Migrations:
  - bucket storage 'email-assets' (public) + 'email-attachments' (privé)
  - table email_unsubscribes
  - colonne unsubscribe_token sur newsletter_subscribers + profiles
  - colonnes send_by_email + email_segment sur news + opportunities
  - cron jobs (pg_cron) pour expiration / renewal

Dépendances à ajouter:
  - @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
```

---

## Ordre d'exécution proposé

Je propose de livrer dans cet ordre pour maximiser l'impact visible :

1. **Phase 1** (fondations design — fix immédiat de ce que vous voyez) ← **commencer ici**
2. **Phase 5 + 6** (templates emails pro + désabonnement)
3. **Phase 2 + 3** (hub admin unifié + monitoring)
4. **Phase 4** (éditeur visuel + uploads)
5. **Phase 7 + 8** (envoi auto news/opportunités + automatisations cron)
6. **Phase 9** (durcissement délivrabilité)

C'est environ **3 à 5 itérations** vu l'ampleur. Chaque phase reste utilisable seule.

**Confirmez-vous cet ordre, ou préférez-vous prioriser autrement (ex : monitoring + éditeur visuel d'abord) ?** Une fois validé, je commence immédiatement la Phase 1.
