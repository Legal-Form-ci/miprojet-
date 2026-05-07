
# Plan d'exécution global

La clé Resend (`RESEND_API_KEY`) est désormais stockée comme secret côté serveur. Je vais exécuter le travail en **6 phases** pour livrer quelque chose de testable à chaque étape, plutôt qu'un big-bang qui casserait la prod.

> **Note importante** : votre `.env` contient des commandes shell collées au-dessus des variables Vite (`cd /workspaces/...`, `git push --force --`). Je vais le nettoyer en phase 0 — sinon le build casse silencieusement.

---

## Phase 0 — Diagnostic & nettoyage (rapide)
1. Nettoyer `.env` (retirer les lignes shell parasites).
2. Lire `AdminOpportunitiesManager`, `Opportunities.tsx`, `Subscription.tsx`, `MiProjetPlusApp.tsx`, `AdminSubscriptionsManager` (si existe) pour comprendre pourquoi les listes sont vides.
3. Vérifier en base : `select count(*) from opportunities`, `from subscription_plans`, `from mp_projects`, `from user_subscriptions`. Confirmer si c'est un bug RLS, un bug UI, ou des données manquantes.
4. Lister les fichiers liés à la newsletter (`useNewsletterSubscribe`, footer, etc.).

## Phase 1 — Backend Resend + Email Center
1. **Edge functions Supabase** :
   - `send-email` : envoi unitaire (admin / système). Auth admin obligatoire.
   - `send-campaign` : envoi en lot à un segment (`all`, `newsletter`, `premium`, `elite`, `custom_ids`). Boucle batch 100/req, throttling.
   - `ai-generate-email` : génère sujet + HTML (template MIPROJET responsive avec logo) à partir d'un prompt via Lovable AI Gateway (`google/gemini-3-flash-preview`).
   - `notify-new-opportunity` : déclenchée à la publication d'une opportunité ; envoie automatiquement aux abonnés Premium + Elite actifs.
   - `welcome-newsletter` : confirmation d'inscription footer.
   - `welcome-subscription` : email de bienvenue après abonnement payant.
2. **Tables nouvelles** (migration) :
   - `email_campaigns` (id, subject, html, segment, status, sent_count, created_by, scheduled_at, sent_at).
   - `email_logs` (campaign_id, recipient_email, status, provider_id, error, sent_at).
   - `email_templates` (id, name, html, variables jsonb) pré-remplie avec 3 templates (newsletter, opportunité, transactionnel).
   - RLS : admin only sur tout sauf `email_logs.select` pour l'utilisateur concerné.
3. **Triggers DB** : à l'`UPDATE` de `opportunities` quand `status` passe à `published`, `pg_net.http_post` vers `notify-new-opportunity`.

## Phase 2 — Modules cassés
1. **Opportunités admin + public** : appliquer les correctifs déjà décrits dans `.lovable/plan.md` (dialog, WYSIWYG body, refonte page publique calquée sur News).
2. **Abonnements** : vérifier que `subscription_plans` est peuplée ; sinon seed Free/Pro/Premium/Elite. Réafficher la liste dans `AdminSubscriptionsManager` et `/subscription`.
3. **MiProjet+** : auditer `MiProjetPlusApp` (probable régression de routing ou requête RLS). Réparer affichage admin + porteur de projet.

## Phase 3 — Espace admin "Email Marketing"
Nouvelle section `/admin/emails` avec onglets :
- **Composer** : prompt → bouton "Générer avec IA" → preview HTML → choix segment → "Envoyer maintenant" / "Programmer".
- **Campagnes** : liste, statuts, taux d'ouverture (best-effort via Resend webhook).
- **Abonnés newsletter** : liste, export CSV, désinscription manuelle.
- **Templates** : édition des 3 templates de base.
- **Logs** : derniers envois et erreurs.

## Phase 4 — Newsletter footer + automatisations
1. Le formulaire footer existant (`useNewsletterSubscribe`) déclenche `welcome-newsletter` (email de bienvenue réel envoyé via Resend).
2. Le checkout d'abonnement réussi déclenche `welcome-subscription`.
3. Publication d'une opportunité → email auto Premium/Elite (via le trigger phase 1).

## Phase 5 — Refonte UI complète
**Important** : "refonte complète" est un projet de plusieurs jours en soi. Je vais livrer une **refonte progressive** :
- Nouveau design system dans `src/styles.css` (palette MIPROJET vert/or, typo Sora + Manrope, animations soignées).
- Refonte Hero, Navigation, Footer, sections home (`StatsSection`, `ServicesSection`, `LatestNews`, CTA).
- Refonte pages clés : `Subscription`, `Opportunities`, `News`, `About`.
- Les autres pages héritent automatiquement du nouveau design system.

## Phase 6 — Tests réels
1. Envoi test Resend depuis admin → boîte mail réelle.
2. Inscription newsletter footer → email reçu.
3. Publication d'une opportunité de test → email Premium/Elite reçu.
4. Rapport final + liens admin (Edge Functions, logs, SQL editor).

---

## Détails techniques clés

| Élément | Implémentation |
|---|---|
| Envoi Resend | `fetch('https://api.resend.com/emails', { headers: { Authorization: 'Bearer ' + RESEND_API_KEY } })` depuis edge function (clé jamais exposée au client) |
| Sender | `MIPROJET <noreply@ivoireprojet.com>` (domaine déjà vérifié selon vous — je vérifierai via l'API Resend en début de phase 1) |
| IA | Lovable AI Gateway, modèle `google/gemini-3-flash-preview`, prompt système : "Tu es un email marketer pro. Génère un email HTML responsive aux couleurs MIPROJET (vert #16a34a, or #eab308), avec header logo + CTA + footer désinscription." |
| Segmentation Premium/Elite | `select user_id, email from user_subscriptions us join subscription_plans p on p.id=us.plan_id join profiles pr on pr.id=us.user_id where us.status='active' and p.name in ('Premium','Elite')` |
| Anti-doublon | Table `email_logs` avec contrainte `unique(campaign_id, recipient_email)` |

---

## Ce que je NE peux PAS garantir en une seule passe
- Une refonte UI "Awwwards-level" sur **toutes** les 40+ pages du site en un seul tour. Je livre le design system + pages prioritaires en phase 5, puis on itère.
- Les statistiques d'ouverture Resend nécessitent la configuration d'un webhook Resend → je laisserai l'endpoint prêt mais vous devrez coller l'URL dans le dashboard Resend.

---

**Approuvez ce plan et je lance l'exécution dans l'ordre Phase 0 → Phase 6.** Si vous voulez prioriser autrement (par ex : Resend + opportunités cassées d'abord, refonte UI plus tard), dites-le maintenant.
