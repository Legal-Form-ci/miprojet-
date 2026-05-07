
# Plan d'action complet

## 1. Éditeurs admin – uploads & création d'opportunités

### Problèmes
- WYSIWYGEditor (actualités) n'upload plus images/documents : la balise `<Toggle asChild>` enveloppe un `<span>` à l'intérieur d'un `<label>` ; le clic ouvre rarement l'input. Aucun bouton « document » n'existe dans la barre d'outils actualité.
- AdminOpportunitiesManager : le bouton « Nouvel appel à projets » n'ouvre pas réellement le formulaire complet sur certains parcours, et l'éditeur de contenu IA n'est pas exposé pour le corps de l'article.

### Correctifs
1. **WYSIWYGEditor.tsx** :
   - Restructurer la barre : remplacer `<Toggle asChild>` autour d'un input file par un vrai `<Button type="button">` qui déclenche `inputRef.current.click()`. Idem pour les documents.
   - Ajouter un bouton **« Document » (Paperclip)** qui upload vers le bucket privé `documents/` et insère dans le HTML un lien `<a href>` (pdf/doc/xls/ppt). Limite 50 Mo.
   - Préfixer le `fileName` par `${user.id}/editor/...` pour respecter la politique RLS « folder-per-user » du bucket `documents`.
2. **AdminOpportunitiesManager.tsx** :
   - Ajouter, dans la SECTION D – Contenu stratégique, un `WYSIWYGEditor` pour le champ `content` (assistance IA déjà disponible via le bouton « Générer avec IA »).
   - Vérifier que `Dialog` s'ouvre bien et que `resetForm()` ne ferme pas le dialog lui-même quand on clique « Nouveau » — corriger l'ordre `resetForm(); setIsDialogOpen(true);`.
   - Le `UniversalAIEditor` reste pour l'image de couverture / titre, mais le corps long passe par WYSIWYG pour cohérence avec actualités.

## 2. Affichage public des opportunités calqué sur les actualités

- `src/pages/Opportunities.tsx` : reproduire la mise en page de `News.tsx` (card list, hero, filtres, badges, pagination, lien vers `OpportunityDetail`).
- `OpportunityDetail.tsx` : utiliser `ArticleLayout` (déjà utilisé pour news) pour un rendu identique.

## 3. Sections vides avec barre verte (capture)

### Cause
Le sélecteur Tailwind `prose-h2:pl-4 prose-h2:border-l-4 prose-h2:border-primary` applique la barre verte à **tout** `<h2>`, y compris les `<h2>` vides ou contenant uniquement `<br>` / espaces générés par l'éditeur.

### Correctif (`src/index.css` + `ArticleLayout.tsx`)
- Ajouter une règle CSS globale qui masque les titres vides :
  ```css
  .article-body :is(h1,h2,h3,h4):empty,
  .article-body :is(h1,h2,h3,h4):has(> br:only-child),
  .article-body :is(h1,h2,h3,h4):not(:has(*)):where(:not(:has(:not(:empty)))) { display: none; }
  ```
- Étape supplémentaire dans `normalizeArticleHtml` : retirer les `<h2></h2>`, `<h3></h3>`, `<p></p>`, `<hr>` orphelins et les `<h*><br/></h*>` avant rendu (via DOMParser, branche client). S'applique aux articles déjà publiés, sans toucher au contenu en base.

## 4. OG/Twitter, WhatsApp & cache d'image

### a. Parité Twitter ↔ OG
Déjà alignés dans `api/social.js` (`twitter:title/description/image` reprennent les mêmes valeurs OG avec CTA + lien). Ajouter explicitement `twitter:url` et `twitter:site` pour complétude.

### b. WhatsApp – titre en gras
WhatsApp n'utilise PAS le tag `og:title` pour le formatage gras ; il met automatiquement en gras la **première ligne** du `og:description` quand la description commence par `*texte*`. 
→ Adapter `buildSocialDescription` pour préfixer la description envoyée aux crawlers WhatsApp uniquement (détection UA `WhatsApp`) avec `*${title}*\n\n${résumé}…` et garder la version standard pour les autres.

### c. Image de couverture WhatsApp
- Forcer `og:image` ≤ 300 Ko et < 600x315 ratio recommandé via `og-cover.js` (déjà fait) — vérifier que la fonction renvoie bien `Content-Type: image/jpeg` et un `Content-Length` correct sinon WhatsApp rejette.
- Ajouter `og:image:type` = `image/jpeg`.

### d. Purge du cache OG/proxy lors d'une mise à jour
- Nouvelle Edge Function `purge-og-cache` (admin only) qui :
  - prend `{ prefix, slug }`,
  - appelle l'endpoint Vercel `/api/og-cover?…&v=${Date.now()}` pour recharger,
  - déclenche le re-scrape Facebook : `POST graph.facebook.com/?id=URL&scrape=true`,
  - ping LinkedIn `https://www.linkedin.com/sensors/beacon` (best effort).
- Dans `AdminNewsManager` / `AdminOpportunitiesManager`, après update/publish, appeler automatiquement cette fonction.
- Ajouter un bouton manuel « Rafraîchir l'aperçu social » dans la liste admin.

### e. Endpoint debug
- Nouvelle route Vercel `api/og-debug.js` : `GET /api/og-debug?prefix=n&slug=art015-04-026` → renvoie en JSON :
  ```json
  { url, title, description, ogImage, twitterCard, finalCoverProxy, sourceRow }
  ```
  Permet de diagnostiquer rapidement.

## 5. Sécurité (scan + super admins)

### a. Findings restants
1. **Bucket `documents` public** → migration SQL : `UPDATE storage.buckets SET public = false WHERE id = 'documents';`
2. **Politique JWT non vérifiée sur `leads`** → `DROP POLICY` puis recréer avec `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sales')`.
3. **`wave-webhook`** → enforcer signature : retourner 500 si `WAVE_WEBHOOK_SECRET` absent, 401 si header manquant, comparer en temps constant.
4. **`miprojet-assistant`** → étendre `requireAdmin` aux actions `generate_news`, `generate_article_html`, `generate_universal_content`, `generate_opportunity`, `generate_evaluation`, `generate_email`.
5. **`send-lead-confirmation`** → ne plus accepter `downloadUrl` libre : recevoir `documentId`, charger en service-role, générer un signed URL 24 h ; valider l'email via regex stricte ; rate-limit IP simple en mémoire.
6. **`database_backups`** → ajouter policies UPDATE/DELETE admin.
7. **`leads` insert anon** → policy anon avec validation (email regex, longueur nom, source ∈ liste).
8. **Leaked password protection** → ne peut pas être activé via SQL ; on documentera dans un toast admin et on ouvrira automatiquement l'URL Supabase. (Manuel obligatoire — Supabase ne fournit pas d'API.)

### b. Super admins jamais redirigés correctement
- `useAuth.ts` : remettre une route post-connexion basée sur `current_user_has_role('admin')` consulté **à chaque changement de session** (`onAuthStateChange`) et **après refresh** (`getSession`). 
- Si admin → `navigate('/admin', { replace: true })` depuis `Auth.tsx` et `AuthCallback.tsx`. 
- Couvrir les emails listés dans `grant_lifetime_subscription` : `innocentkoffi1@gmail.com`, `marcelkonan@ivoireprojet.com`, etc. — déjà admin via le trigger, donc le RPC suffira.
- Ajouter un test manuel : login → refresh `/` → doit aller `/admin`.

## 6. Tests de partage WhatsApp

Pour chaque type (news, opportunity, project, document), je lancerai après déploiement :
```
curl -A "WhatsApp/2.23.0" https://ivoireprojet.com/n/<slug>
curl -A "WhatsApp/2.23.0" https://ivoireprojet.com/o/<slug>
```
Et je vérifierai via `api/og-debug` que `og:image`, `og:title`, `og:description` sont conformes.

## 7. Mémoire sécurité

Mise à jour de `mem://security` pour rappeler :
- bucket `documents` privé,
- policies leads/admin via `has_role`,
- webhooks signature obligatoire,
- éditeur HTML toujours sanitisé par DOMPurify.

---

## Détails techniques par fichier

| Fichier | Action |
|---|---|
| `src/components/admin/WYSIWYGEditor.tsx` | Refonte boutons upload, ajout bouton document, `useRef<HTMLInputElement>`, scope user |
| `src/components/admin/AdminOpportunitiesManager.tsx` | WYSIWYG sur `content`, fix dialog, IA hook |
| `src/pages/Opportunities.tsx` | Refonte UI calquée News |
| `src/pages/OpportunityDetail.tsx` | Bascule sur `ArticleLayout` |
| `src/lib/sanitizeHtml.ts` | Strip headings/p vides, br seuls |
| `src/index.css` | CSS masquage titres vides |
| `api/social.js` | WhatsApp : `*titre*` dans description, `twitter:url/site`, debug headers |
| `api/og-cover.js` | Forcer JPEG ≤ 300 Ko, `Content-Length` |
| `api/og-debug.js` (NEW) | Endpoint JSON diagnostic |
| `supabase/functions/purge-og-cache/` (NEW) | Re-scrape Facebook / refresh proxy |
| `supabase/functions/wave-webhook/index.ts` | Signature obligatoire |
| `supabase/functions/miprojet-assistant/index.ts` | Admin gate étendu |
| `supabase/functions/send-lead-confirmation/index.ts` | documentId + signed URL |
| Migration SQL | bucket privé, policies leads/backups, anon leads |
| `src/hooks/useAuth.ts`, `src/pages/Auth.tsx`, `src/pages/AuthCallback.tsx` | Redirection admin systématique |

Approuvez ce plan pour que je l'exécute en parallèle.
