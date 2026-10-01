# Mode démo + visite guidée — Design

> Statut : design validé section par section le 2026-10-01, en attente de relecture du document.
> Périmètre : version « démo » en accès libre (sans compte), données fictives cohérentes, visite guidée passable.

---

## 1. Contexte et objectif

**Problème.** La fiche `sandy` du portfolio pointe vers `ma-voiture-sandy.vercel.app` (bouton « Utiliser l'app »). Aujourd'hui, ce lien mène à un écran de connexion : un visiteur (recruteur, développeur) ne voit rien du produit sans créer de compte.

**Objectif.** Un visiteur clique sur « Essayer la démo » et arrive en moins de 2 s sur un tableau de bord rempli. Une carte d'accueil lui propose :
- une visite guidée d'environ 3 min, qui montre l'étendue du produit ;
- ou une exploration libre.

Il peut tout manipuler sans rien casser, sans jamais toucher la vraie base.

**Critères de succès**
1. Aucun appel à Supabase en mode démo, ni en lecture ni en écriture, prouvé par des tests.
2. Toutes les pages de l'app sont utilisables en démo avec des données crédibles. Chaque widget conditionnel a de quoi s'afficher.
3. Les modifications du visiteur (ajout d'un plein, rappel terminé…) sont visibles immédiatement et durant toute sa session. Un bouton les réinitialise.
4. La visite couvre les 7 grandes zones du produit, navigue seule entre les pages, et se quitte, se met en pause ou se reprend à tout moment. Elle fonctionne en desktop et en mobile.
5. L'app réelle ne régresse pas :
   - `tsc` et `npm run build` passent ;
   - la suite de tests garde exactement ses 22 échecs préexistants, sans nouvel échec.

**Hors périmètre** : modifier le portfolio. Il suffira de faire pointer `demoUrl` vers `https://ma-voiture-sandy.vercel.app/demo`.

---

## 2. Décisions validées

| Sujet | Décision | Alternatives écartées |
|---|---|---|
| Écritures en démo | **Bac à sable de session** : les modifications marchent vraiment, restent locales au visiteur et sont réinitialisables | Lecture seule (on ne « sent » pas le produit) ; comptes anonymes Supabase (migration, nettoyage, pollution de la base de prod) |
| Architecture | **A : côté serveur, « graine + journal en cookie »** | B : store client + `fetch` patché (duplique la composition de chaque `page.tsx`, monkey-patching fragile) |
| Lancement de la visite | **Carte d'accueil avec choix** « Visite guidée » / « Explorer librement » ; relançable depuis le bandeau | Lancement automatique ; manuel uniquement |
| Moteur de visite | **Maison**, sans nouvelle dépendance (framer-motion déjà présent) | driver.js, react-joyride : pas de navigation multi-pages App Router ni d'attente du streaming |
| Correctif assurance | **Inclus** (voir §10) | — |
| « Correctif VE » (`fuel_type`) | **Retiré** : la démo utilise les libellés français, comme le formulaire véhicule | Helper de normalisation (touche du code réel sur des hypothèses non vérifiées) |

---

## 3. Architecture

### 3.1 Vue d'ensemble

```
Navigateur ──(cookie mv_demo)──▶ middleware.tsx
                                   │
   pages (/dashboard…) ────────────┤ cookie présent → NextResponse.next()
                                   │
   /api/* (hors /api/demo/*) ──────┴─ cookie présent → rewrite /api/demo/<chemin>
                                                         │
                                  app/api/demo/[...path] │ lit le journal (cookie)
                                                         │ handler pur → { réponse, op? }
                                                         ▼ Set-Cookie (journal + op)

Server Components → lib/data/* :
   if (await isDemoRequest()) return demoData.<même fonction>(…)   ◀── seed(aujourd'hui) + ops(cookie)
   sinon → Supabase (inchangé)
```

**Principe.** Les URLs sont identiques à celles de l'app réelle. Tous les liens en dur (`/garage?vehicleId=…`, `/reminders`, `router.push`…) fonctionnent sans modification. Aucun composant de page n'est dupliqué.

### 3.2 Entrée, sortie, réinitialisation

| Route | Rôle |
|---|---|
| `GET /demo` (`app/demo/route.ts`) | Si le cookie est absent, en crée un avec un journal vide et un `sessionId` aléatoire. S'il existe, le conserve (le visiteur reprend sa démo). Redirige vers `/dashboard`. |
| `POST /api/demo/reset` | Remplace le journal par un journal vide en gardant le `sessionId`. Le client fait ensuite `router.refresh()` et affiche un toast « Démo réinitialisée ». |
| `POST /api/demo/exit` | Supprime le cookie. Le client vide l'état de la visite (localStorage) puis fait `window.location.href = '/'`, ou `'/?mode=signup'` pour le bouton « Créer un compte ». |

**Cookie `mv_demo`**
- Attributs : `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` en production, sans `Max-Age` (cookie de session).
- Valeur : `v1.<base64url(JSON)>`, où le JSON vaut `{ "s": "<sessionId>", "o": [ <ops…> ] }`.
- Version inconnue ou contenu illisible : journal vide. Le prochain appel en écriture réécrit le cookie.
- Taille maximale de la valeur : **3 800 octets**. Si l'ajout d'une op dépasse cette limite, réponse `409 { error: "Limite de la démo atteinte : réinitialisez-la depuis le bandeau pour continuer." }`.
  - Une estimation donne environ 40 modifications.
  - Compression deflate possible plus tard (×5), non retenue pour l'instant.

**Connexion réelle.**
- `SignInForm` et `SignUpForm` appellent `POST /api/demo/exit` **au début de la soumission**, avant tout appel d'authentification.
  - Sans cela, `/api/auth/sign-up` serait réécrit vers la démo et échouerait.
  - Une vraie session ne peut ainsi jamais rester « coincée » en mode démo.
  - Si l'authentification échoue, le visiteur est simplement sorti de la démo. Il est alors sur la landing, et « Essayer la démo » l'y ramène.
- À l'inverse, entrer dans la démo alors qu'on est connecté pour de vrai fonctionne : le cookie démo prend la priorité, et « Quitter » ramène à l'app réelle.

### 3.3 Middleware

On ajoute deux branches explicites. La logique existante est conservée, y compris les en-têtes de cache des assets statiques :

```ts
const isDemo = req.cookies.has(DEMO_COOKIE);

// 1. En démo, toute l'API est servie par le faux backend
if (isDemo && pathname.startsWith('/api/') && !pathname.startsWith('/api/demo/')) {
  return NextResponse.rewrite(new URL(`/api/demo/${pathname.slice(5)}${req.nextUrl.search}`, req.url));
}

if (isPublicPath(pathname)) { /* … inchangé (Cache-Control des assets) … */ }

// 2. En démo, les pages ne demandent pas de session Supabase
if (isDemo) return NextResponse.next();

// … vérification de session actuelle, inchangée
```

Conséquence : en démo, les ~50 vraies routes API sont **inatteignables**. La branche 2 garantit que la démo continuera de fonctionner le jour où `isPublicPath` sera corrigé.

> ⚠️ Constat (hors périmètre, §12) : `isPublicPath` renvoie `true` pour **tous** les chemins, car `'/x'.startsWith('/')` est vrai. La vérification de session du middleware est donc du code mort aujourd'hui. La branche démo ne s'appuie pas dessus.

### 3.4 Lecture (SSR)

- **`lib/demo/server.ts`** (server-only)
  - `isDemoRequest()` lit le cookie via `next/headers`.
  - `getDemoState = cache(async () => applyOps(buildDemoSeed(today), decodeJournal(cookie)))` : mémoïsé par requête.
- **`lib/demo/data.ts`** fournit un équivalent pour chacune des **24 fonctions** de `lib/data/**` qui touchent Supabase, avec le même nom et la même signature :
  - **utilisateur** : `getCurrentUser`, `getCurrentUserInfo`, `getUserInfo`, `getUserFamilyId`, `getUserFamilyIds`, `getUserFamilies`, `getUserPreferences`, `getPreferencesByUserId` ;
  - **véhicules** : `getUserVehicles`, `getUserVehiclesMinimal`, `getFamilyVehicles`, `getFamilyVehiclesMinimal`, `getFamilyAllVehicles` ;
  - **dépenses et entretien** : `getAllExpenses`, `getMaintenanceExpenses` (dans `lib/data/maintenance` **et** le doublon dans `lib/data/expenses`), `getFillExpenses` (nouveau), `getMaintenanceTypes` ;
  - **rappels** : `getReminders`, `getVehicleReminders`, `getOverdueCount` ;
  - **assurance et famille** : `getActiveInsuranceVehicleIds`, `getFamilyInfo`, `getFamilyMembers`.
- **Règle uniforme** : chacune de ces fonctions commence par `if (await isDemoRequest()) return demoData.xxx(…);`, même celles qui sont inutilisées aujourd'hui.
- Les composites `getAllVehicles` et `getAllVehiclesMinimal` n'appellent que des feuilles et restent inchangés.
- **Petit refactor.** La requête Supabase inline de `app/(app)/reminders/page.tsx` (`getFillExpenses`) déménage dans `lib/data/expenses/getFillExpenses.ts`. Toutes les lectures passent ainsi par la couche data.
- Les fonctions de `lib/demo/views.ts` reproduisent **exactement** les formes des vues SQL. Le détail est en §4.4.

### 3.5 Écriture (bac à sable)

- **`app/api/demo/[...path]/route.ts`**
  - Exporte `GET`, `POST`, `PATCH`, `DELETE`, avec `dynamic = 'force-dynamic'`.
  - À chaque requête : décode le journal, construit l'état, puis appelle `dispatch(method, path, { body, query, state, viewerId })`.
- **`lib/demo/api/router.ts`** contient la table de routage `"POST fills/add" → handler`.
- **Handlers.** Ce sont des fonctions **pures** `(ctx) → { status, json, op? }`, testables sans Next. Quand une op est renvoyée :
  1. on vérifie que l'état reste cohérent en appliquant l'op ;
  2. on encode le nouveau journal et on contrôle la taille ;
  3. on répond avec `Set-Cookie`.
- **Rafraîchissement.** Après une mutation, les hooks existants appellent `router.refresh()`. Le navigateur a déjà le nouveau cookie, donc le rendu serveur reflète la modification sans aucun changement côté client.
- **Fallbacks :**
  - endpoint non émulé → `501 { error: "Cette action n'est pas disponible dans la démo." }` ;
  - exception → `500 { error: 'Erreur serveur inattendue' }`.
- **Garde-fou statique.** Une règle ESLint `no-restricted-imports` interdit `@/lib/supabase/*` dans `lib/demo/**` et `app/api/demo/**`.

### 3.6 Côté client

- **`DemoProvider`** (`components/demo/DemoProvider.tsx`)
  - `AppDataProvider` le monte **uniquement en démo**. Il le reçoit avec `sessionId` ; les fetchers lui fournissent déjà les données démo.
  - Il expose `useDemo()`, qui renvoie `null` hors démo, et les actions `reset()`, `exit({ signup? })`, `startTour()`.
  - Il monte le `TourProvider`, la `WelcomeCard` et le `TourOverlay`.
- **`DemoBanner`**
  - Bandeau fin rendu par `PrivateLayoutContent` au-dessus du `Header` quand `useDemo()` n'est pas nul.
  - Texte : « 🧪 Mode démo · données fictives — vous êtes Camille ».
  - Boutons : **Visite guidée** (lance ou reprend), **Réinitialiser** (avec confirmation), **Créer un compte**, **Quitter**.
  - Version compacte sur mobile.
- **Garde-fous ciblés**, tous neutres hors démo :
  - `LogoutButton` : en démo, devient « Quitter la démo » et appelle `exit()`.
  - `useVehicleImageUpload` et l'avatar dans `useAccountActions` : en démo, toast « Les photos ne sont pas disponibles dans la démo », sans aucun appel au stockage.
  - `AttachmentUploader` : en démo, bouton désactivé avec la mention « Pièces jointes désactivées dans la démo ».
- **`LandingPageClient`**
  - bouton **« Essayer la démo »** (lien vers `/demo`) bien visible dans le hero ;
  - lecture de `?mode=signup` pour ouvrir directement le formulaire d'inscription.

### 3.7 Sécurité

- En démo, aucun module ne crée de client Supabase :
  - les fetchers sont protégés par la garde ;
  - les routes API réelles ne sont plus atteignables ;
  - `lib/demo` et `app/api/demo` ne peuvent pas importer Supabase (règle ESLint).
- Le cookie ne contient aucun secret. Le modifier ne permet d'altérer que sa propre démo. Le contenu décodé est validé ; s'il est invalide, on repart d'un journal vide.
- Aucune écriture en base, donc ni limitation de débit ni nettoyage nécessaires.

---

## 4. Données de démo

### 4.1 Persona

- **Camille Durand** (`camille.durand@example.com`), inscrite il y a 26 mois.
- Elle est propriétaire de la famille **« Famille Durand »**.
- Membres de la famille :
  - **Thomas Durand** (conjoint), membre ;
  - **Léa Durand** (fille, jeune conductrice), membre.
- Identifiants fixes : UUID de forme `00000000-0000-4000-8000-00000000000X` ; `invite_token` lisible, par exemple `DEMO-DURAND`.

### 4.2 Véhicules

Les valeurs de `fuel_type` sont les **libellés français**, comme ceux que le formulaire véhicule écrit réellement.

| id | Véhicule | Propriétaire | `fuel_type` | Droit de Camille | Rôle dans la démo |
|---|---|---|---|---|---|
| 101 | Peugeot 308 SW 2019, ~92 400 km | Camille | `Diesel` | propriétaire | Historique riche ; **anomalie de conso** sur le dernier plein (+20 % environ) ; **CT dans 12 jours** ; changement d'assureur |
| 102 | Renault Zoé 2021, ~38 900 km | Camille | `Électrique` | propriétaire | Recharges à domicile (~0,23 €/kWh) et sur bornes rapides (~0,49 €/kWh) ; rappel en retard |
| 103 | Kia Niro hybride rechargeable 2021 | Thomas | `Hybride rechargeable` | **écriture** | Pleins **et** recharges ; Camille peut y saisir des dépenses |
| 104 | Peugeot 208 2016 | Léa | `Essence` | **lecture** | Lecture seule ; rappel « Pneus » en retard (créé par Léa) |
| 105 | Renault Clio III 2011 | Camille | `Essence` | propriétaire | Statut `sold` depuis 14 mois |

Tous les véhicules ont une couleur, une plaque au format SIV, une transmission, un `co2_emission` (sauf la Zoé, à 0) et une `tech_control_expiry`. La Clio n'a pas de date de CT.

### 4.3 Historique (24 mois glissants)

- **Génération déterministe.**
  - Un PRNG à graine fixe (mulberry32) produit toujours le même résultat pour un même jour ; les dates sont **relatives à aujourd'hui**.
  - Le nombre d'entités par véhicule est fixe et les dates glissent avec le temps. Les identifiants restent donc stables d'un jour à l'autre, et les ops du journal qui les référencent restent valides.
- **Prix crédibles** avec courbe saisonnière et bruit : gazole 1,62–1,84 €/L, SP95-E10 1,70–1,92 €/L, électricité 0,23 €/kWh à domicile et 0,49 €/kWh sur borne.
- **Volumes approximatifs** :
  - ~230 pleins et recharges ;
  - ~25 entretiens dans des garages fictifs ;
  - des dépenses « autres » : péage, parking, lavage ;
  - les mensualités d'assurance.
- **Assureurs fictifs** : « Mutuelle des Routes », « Assurance Horizon », « Prévoyance Auto ».
- **Contrats d'assurance**
  - 308 : un ancien contrat clos il y a 14 mois (52,40 €/mois), puis un contrat actif (46,20 €/mois). Cela fait apparaître l'historique et l'évolution du tarif.
  - Zoé, Niro (contrat de Thomas), 208 (contrat de Léa) : un contrat actif chacun.
  - Clio : contrat clos à la vente.
- **Mensualités d'assurance.** Elles sont **dérivées** des contrats à la lecture, comme le font les triggers SQL : une ligne par mois, de `start_date` à `min(end_date, aujourd'hui)`, avec la note « Mensualité » et des identifiants déterministes dans une plage dédiée. L'interface ne permet ni de les modifier ni de les supprimer, et la vraie route renvoie 403 en cas de suppression.
- **Rappels de Camille** (les seuls visibles sur le tableau de bord et dans le badge) :
  - 308 « Contrôle technique » : échéance à J+12, **bientôt dû** ;
  - Zoé « Permutation des pneus » : échéance à J−6, **en retard** ;
  - 308 « Vidange » : au kilométrage, odomètre actuel + 1 200 km, récurrent tous les 15 000 km, date estimée à partir du rythme de conduite ;
  - Niro « Révision annuelle » : échéance à J+55, récurrent tous les 12 mois ;
  - Zoé « Balais d'essuie-glace » : **terminé**.
- **Rappel de Léa** : 208 « Pneus avant à changer », échéance à J−20. Il est visible sur `/reminders` mais pas sur le tableau de bord, comme dans l'app réelle.
- **`maintenance_types` de démo**
  - Mêmes identifiants et libellés que `types/maintenance.ts`.
  - Intervalles choisis pour que les suggestions restent pertinentes, sans en générer en masse :
    - `oil_change` : 15 000 km, sans durée ; ainsi un véhicule électrique sans vidange ne déclenche jamais de suggestion ;
    - `revision` : 12 mois ;
    - `inspection` : 24 mois ;
    - `tires` : 40 000 km ;
    - `brakes` : 30 000 km ;
    - autres types : sans intervalle.
  - Résultat attendu : 2 entretiens à planifier sur la 308, la révision (en retard) et le CT (dans 12 jours).
- **Préférences de Camille**
  - `default_period` vaut `'year'`, ou `'all'` en janvier et février pour que le tableau de bord ne soit jamais vide.
  - `default_vehicle_scope` vaut `'all'`.
  - Tous les `show_*` valent `true`.
  - `updated_at` est une date fixe ancienne. Ainsi, le localStorage d'un visiteur ayant aussi utilisé l'app réelle n'entre pas en conflit avec les préférences démo.

### 4.4 Formes renvoyées (fidèles aux vues SQL)

- **`vehiclesForDisplay(state, viewerId)`**
  - Ne renvoie que les véhicules dont le viewer est propriétaire, ou sur lesquels il a une permission.
  - Champs dérivés :
    - `owner_name` ;
    - `permission_level` (celle du viewer) ;
    - `family_ids` et `family_id` (familles du propriétaire) ;
    - `name`, qui retombe sur `make + ' ' + model` à défaut ;
    - `last_fill_date`, le `created_at` du dernier plein ou de la dernière recharge ;
    - `calculated_consumption`, avec la même formule que la vue : somme des litres hors dernier plein, divisée par la distance entre le plus petit et le plus grand odomètre hors dernier plein, fois 100, arrondie à 0,1 ; `null` si la distance est nulle ;
    - `insurance_*`, tiré du contrat le plus récent par `start_date` ;
    - `attachments: []`.
- **`expensesForDisplay(state)`** : jointure de `vehicle_name`, `owner_name`, `odometer` (pris sur le plein ou l'entretien), `label`, `maintenance_type`, `maintenance_type_label`, `garage`, des champs de plein, de `charge_type` et de `attachments: []`. Les mensualités d'assurance dérivées y sont incluses. Les dates sont au format `YYYY-MM-DD`.
- **`usersInfo(state, userId)`**, **`familyForDisplay(state, familyId)`**, **`familyMembers`** (avec `avatar_url`) suivent les colonnes de `views.sql`.

### 4.5 Invariants testés

Les tests utilisent les **vrais utilitaires** de l'app, pour que la démo montre réellement ces fonctionnalités :
- `detectAnomalies` renvoie une anomalie pour la 308.
- `computeHealthScore` fait remonter au moins 3 facteurs warning/critical sur les véhicules de Camille (CT, rappel en retard, rappel imminent).
- `computeMaintenanceSuggestions` renvoie au moins une suggestion.
- `getReminderStatus` produit au moins un rappel dans chacun des états `overdue`, `due-soon` et `upcoming`, plus au moins un rappel terminé.
- Il y a au moins 2 véhicules avec des dépenses dans la période par défaut, pour le tableau comparatif.
- Il y a au moins 6 pleins avec odomètre par véhicule thermique actif.
- La graine est déterministe pour une date donnée, et les identifiants restent stables entre deux dates différentes.

---

## 5. Journal des modifications

- **Types d'ops.** Union discriminée avec des clés courtes, versionnée par le préfixe `v1.` :
  - plein ajouté ou modifié ;
  - dépense « autre » ajoutée ;
  - dépense modifiée ou supprimée ;
  - entretien ajouté ou supprimé ;
  - rappel créé, modifié, supprimé ou terminé ;
  - contrat créé, modifié ou supprimé ;
  - véhicule ajouté, modifié ou supprimé ;
  - permissions modifiées ;
  - famille renommée ;
  - préférences modifiées ;
  - nom de profil modifié.
- **Identifiants des entités créées.**
  - Ils valent `max(identifiants de la même table) + 1`. Les mensualités d'assurance dérivées sont exclues du calcul : elles vivent dans une plage dédiée ≥ 1 000 000.
  - Ils sont **stockés dans l'op**, ce qui rend le rejeu déterministe.
- **`applyOps(seed, ops)`** applique les reducers dans l'ordre. Une op invalide est ignorée, par exemple si elle référence une entité supprimée.
- **Les reducers reproduisent les effets des triggers et des routes :**
  - plein avec odomètre → `vehicles.odometer` mis à jour, comme la vraie route ;
  - ajout d'entretien, ou modification avec `maintenance_type` → création ou mise à jour du rappel (vehicle, type), sur le modèle de `update_maintenance_reminder` et `compute_next_due` ;
  - rappel récurrent terminé → insertion de l'occurrence suivante (`time` : +N mois ; `km` : odomètre + N) ;
  - contrat créé ou modifié → mensualités recalculées, automatiquement grâce à la dérivation ;
  - suppression d'un véhicule → suppression en cascade de ses dépenses, contrats, rappels et permissions.

---

## 6. Faux backend : couverture

L'interface n'appelle que 36 des 49 handlers. Les formes de réponse et les messages d'erreur sont **identiques** aux vraies routes (référence : catalogue des routes établi le 2026-10-01).

### 6.1 Lectures émulées

| Endpoint | Réponse | Appelé par |
|---|---|---|
| `GET expenses/get?vehicleIds=` | `{ expenses }` | Statistiques |
| `GET expenses/maintenanceExpense?vehicleIds=` | `{ expenses }` | Entretiens |
| `GET insurance/get?vehicle_id=` | `{ contracts }` ; 403 si le véhicule n'est pas visible | Assurance, fiche véhicule |
| `GET search?q=` | `{ expenses (≤ 8), reminders (≤ 5) }` | Ctrl+K. Même périmètre qu'en vrai : dépenses des véhicules **possédés**, rappels personnels non terminés |
| `GET vehicles/permissions?vehicleId=` | `{ data: [{ user_id, permission_level }] }` ; 403 si l'utilisateur n'est pas propriétaire | Famille |
| `GET family/getByInvitToken?token=` | 404 « Dans la démo, il n'y a pas d'autre famille à rejoindre. » | Page `/family/join` |

### 6.2 Écritures émulées

| Endpoint | Réponse (champs lus par le client) | Règles reproduites |
|---|---|---|
| `POST fills/add` | 201 `{ fill: { expense_id, … }, message }` | droit d'écriture (403 sur la 208) ; odomètre |
| `PATCH fills/update` | `{ fill, message }` | `id` = identifiant de **dépense**, comme l'envoie le tableau de bord ; propriétaire ou droit d'écriture |
| `POST expenses/other/add` | 201 `{ expense: { id, label, vehicle_name, … } }` | droit d'écriture |
| `PATCH expenses/update` | `{ expense, message }` | champs spécifiques selon le type ; recalcul du rappel d'entretien |
| `DELETE expenses/delete` | `{ message, expenseId }` | 403 « Les dépenses d'assurance ne peuvent pas être supprimées » |
| `POST maintenance/add` | 201 `{ expense: { id, … } }` | création ou mise à jour du rappel ; odomètre |
| `DELETE maintenance/delete` | `{ message }` | le rappel créé automatiquement est conservé, comme en vrai |
| `POST reminders/create` · `PATCH update` · `DELETE delete` · `PATCH complete` | `{ reminder }` / `{ success }` | droit d'écriture ; occurrence suivante d'un rappel récurrent |
| `POST insurance/create` · `PATCH update` · `DELETE delete` | `{ contract }` / `{ success }` | propriétaire uniquement ; mensualités dérivées |
| `POST vehicles/add` · `PATCH update` · `DELETE delete` | `{ vehicle }` / `{ message, vehicle_id }` | `vehicles/add` renvoie `vehicle.id`, comme la vraie route ; suppression réservée au propriétaire, avec cascade |
| `POST vehicles/permissions` | `{ success }` | propriétaire ; les cibles doivent être membres de sa famille |
| `PATCH family/update` | `{ success, message, family }` | propriétaire ; nom de 100 caractères maximum |
| `PATCH users/preferences` | `{ success, updated_at }` | validation de `default_period` et `default_vehicle_scope` |
| `POST users/update-profile` | `{ success, message }` | le **nom** est émulé ; un changement d'email est refusé (voir §6.3) |

### 6.3 Désactivé, avec message explicite (403 `{ error }`)

Format du message : « … n'est pas disponible dans la démo. »
- **Compte** : `users/change-password`, changement d'email, `auth/delete-account`.
- **Fichiers** : `attachments/add` et `attachments/delete`. Côté client, le sélecteur est désactivé et l'upload de photos est bloqué (§3.6).
- **Famille** : `family/create`, `family/join`, `family/leave`, `family/delete`. On garde ainsi intactes l'histoire de la démo et le chapitre Famille de la visite.
- **Les 13 handlers jamais appelés par l'interface** : réponse **501** générique.

---

## 7. Moteur de visite guidée

### 7.1 Pièces

| Fichier | Rôle |
|---|---|
| `lib/demo/tour/steps.ts` | Données pures : chapitres (id, libellé, emoji) et étapes |
| `lib/demo/tour/reducer.ts` | Machine à états pure (voir 7.2) |
| `components/tour/TourProvider.tsx` | État, persistance, navigation, raccourcis clavier |
| `components/tour/TourOverlay.tsx` | Voile, découpe et halo, rendus dans un portail |
| `components/tour/TourPopover.tsx` | Bulle : titre, texte, progression, contrôles |
| `components/tour/useTourTarget.ts` | Attente, choix, défilement et suivi de la cible |
| `components/tour/placement.ts` | Calcul pur de la position de la bulle |
| `components/demo/WelcomeCard.tsx` | Carte d'accueil |

**Schéma d'une étape**

```ts
interface TourStep {
  id: string;
  chapter: TourChapterId;
  route: string;                 // ex. '/statistics', '/garage?vehicleId=101'
  target?: string;               // valeur de data-tour ; absent → carte centrée
  title: string;
  body: string;
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  interactive?: boolean;         // l'utilisateur peut manipuler la page (« Essayez »)
  onEnter?: TourAction;          // ex. { type: 'click', target: 'expense-button-trigger' }
  onExit?: TourAction;           // ex. referme le menu ouvert par onEnter
}
```

**Ancres.** Ce sont des attributs `data-tour="…"` ajoutés aux composants existants. Ils sont inertes en production et pourront servir de sélecteurs E2E. Ils sont posés de préférence sur un élément déjà présent qui a une boîte : jamais sur un wrapper `display: contents`, qui n'a pas de rectangle mesurable.

### 7.2 Machine à états

- **États :** `welcome | running | paused | done | dismissed`, plus `stepIndex` et `sessionId`.
- **Actions :** `START(chapter?)`, `NEXT`, `PREV`, `SKIP_CHAPTER`, `GOTO_CHAPTER(id)`, `PAUSE`, `RESUME`, `STOP`, `COMPLETE`.
- **Bornes :** `PREV` au début ne fait rien ; `NEXT` à la fin déclenche `COMPLETE`.
- **Persistance** dans le localStorage, sous la clé `mv-demo-tour`, avec lectures et écritures protégées par try/catch.
  - Si le `sessionId` stocké diffère de celui du cookie (nouvelle démo), l'état repart sur `welcome`.
  - « Réinitialiser » ne touche pas à l'état de la visite ; « Quitter » le vide.

### 7.3 Navigation

- **Étape sur une autre page :** `router.push(step.route)`. La navigation est marquée « initiée par la visite » via un ref. La bulle affiche « Direction <page>… » et le spotlight s'efface.
- **Attente de la cible :**
  - MutationObserver avec un délai maximum de **4 s** ;
  - on prend le **premier élément visible** correspondant, ce qui gère les doublons desktop/mobile du header ;
  - on le fait défiler juste sous le header sticky.
- **Cible introuvable** (widget vide, élément masqué sur mobile) : carte centrée, sans spotlight. La visite n'est jamais bloquée.
- **Suivi de position :** boucle `requestAnimationFrame` tant que l'étape est active, nécessaire à cause des animations d'entrée `slide-in` de 500 ms. La mise à jour n'a lieu que si le rectangle a changé.
- **Navigation manuelle du visiteur** (changement de pathname non initié par la visite) : action `PAUSE`, et une pastille « Reprendre la visite · n/N » apparaît.
  - Seul le **pathname** est comparé. Ainsi, le `router.replace('/garage')` que fait `GarageClient` après avoir lu `?vehicleId=` ne déclenche pas de pause.
- **Rechargement de page :** la visite reprend à l'étape courante.

### 7.4 Rendu et interactions

- **Couches :**
  - le voile sombre (SVG avec masque arrondi, `pointer-events: none`) et les quatre bloqueurs de clic autour de la découpe sont en **z-45** ;
  - la bulle est en **z-80**.
- **Effet de ce choix :** les menus, modales, tiroirs et toasts de l'app (z-50 à z-70) restent **au-dessus** du voile, donc visibles et utilisables pendant les étapes « Essayez ».
- **Étapes non interactives :** les clics hors de la découpe sont bloqués et un clic sur le voile ne fait rien. La sidebar desktop (z-50) reste cliquable ; l'utiliser met la visite en pause.
- **Contrôles :**
  - **← Précédent**, **Suivant →** (« Terminer » à la dernière étape) et **✕ Quitter**. Quitter affiche un toast « Relancez la visite depuis le bandeau démo ».
  - Une barre de progression segmentée par chapitre ; cliquer sur un segment saute au chapitre correspondant.
  - Un lien **« Passer ce chapitre »**.
- **Clavier :** → ou Entrée pour suivant, ← pour précédent, Échap pour quitter. Ces raccourcis sont ignorés quand le focus est dans un champ `input`, `textarea` ou `select`.
- **Accessibilité :**
  - la bulle a `role="dialog"` et `aria-labelledby` ;
  - le focus va sur la bulle à chaque étape ;
  - une région `aria-live="polite"` annonce l'étape.
- **Mobile (< 640 px) :** la bulle devient une feuille ancrée en bas (hauteur maximale 45 vh), et la cible est défilée dans la moitié haute de l'écran.
- **Animations :** springs framer-motion pour le glissement du spotlight et l'apparition de la bulle. Le halo pulse dans la couleur `custom-1`. `prefers-reduced-motion` coupe glissement et pulsation.
- Le **mode sombre** est géré via les classes `dark:` de l'app.

---

## 8. Scénario de la visite

**Ton :** phrases courtes et complices, une touche d'humour. Titre de 6 mots maximum, texte de 1 à 2 phrases. Les textes définitifs seront rédigés dans `steps.ts` et relus pendant l'implémentation.

**Carte d'accueil**
> 👋 **Bienvenue dans Ma Voiture.** Vous êtes Camille : 4 véhicules, 2 ans d'historique, une famille… et le droit de tout casser — la démo se réinitialise d'un clic.

Boutons : **Visite guidée (~3 min)** · **Explorer librement**.

**Étapes**

| # | Chapitre | Route | Cible `data-tour` | Message |
|---|---|---|---|---|
| 1 | Tableau de bord | `/dashboard` | `dashboard-stats` | 4 chiffres clés : coût aux 100 km, total, conso, dernier plein, avec leurs tendances |
| 2 | | | `dashboard-insights` | Points d'attention : CT qui approche, rappel en retard, conso anormale de la 308 ; un clic mène au bon endroit |
| 3 | | | `dashboard-vehicles` | Score de suivi de A à F par véhicule |
| 4 | | | `header-filters` (*interactive*) | **Essayez :** changez de véhicules ou de période, tout se recalcule et le choix vous suit partout |
| 5 | | | `expense-button` (`onEnter` : ouvre le menu) | Plein, recharge, entretien, autre dépense ou rappel en quelques secondes ; carte centrée sur mobile |
| 6 | Statistiques | `/statistics` | `stats-overview` | Dépenses, moyenne mensuelle, projection annuelle, coût au km |
| 7 | | | `stats-monthly` | Mois par mois, par catégorie ou par véhicule ; export SVG |
| 8 | | | `stats-carbon` | Empreinte carbone, avec données officielles ou calculée sur les litres réels |
| 9 | | | `stats-comparison` | Duel de véhicules, catégorie par catégorie |
| 10 | Dépenses | `/expenses` | `expenses-filters` | Filtres par catégorie, recherche dans les notes, fourchette de montants |
| 11 | | | `expenses-list` | Historique mois par mois ; un clic pour le détail, ⋮ pour modifier |
| 12 | | | `expenses-csv` | Export CSV pour le comptable, l'assureur ou Excel ; carte centrée sur mobile |
| 13 | Entretiens et rappels | `/maintenance` | `maintenance-suggestions` | Échéances calculées depuis l'historique ; un clic crée le rappel |
| 14 | | `/reminders` | `reminders-list` | En retard, bientôt dus, à venir ; date estimée d'après votre rythme de conduite |
| 15 | Assurance et garage | `/insurance` | `insurance-overview` | Contrats, prochaine échéance, historique des tarifs ; mensualités ajoutées automatiquement aux dépenses |
| 16 | | `/garage?vehicleId=101` | `vehicle-health` | Bilan de santé de la 308, facteur par facteur, avec quoi faire |
| 17 | Famille | `/family` | `family-vehicles` | Camille, Thomas et Léa partagent leurs véhicules ; droits lecture ou écriture par personne |
| 18 | Pour finir | `/family` | `global-search` | Ctrl+K, et c'est trouvé : véhicules, dépenses, rappels, pages |
| 19 | | `/settings` | `settings-panel` (`onEnter` : clic sur `settings-preferences`) | Thème clair ou sombre, filtres par défaut, ce que la famille voit de vos véhicules |

**Carte finale :** « 🎉 Vous avez fait le tour ! Ajoutez un plein, terminez un rappel, cassez tout : la démo se réinitialise d'un clic. » Boutons **Créer mon compte** · **Continuer à explorer**.

**Total : 19 étapes.** L'onglet « Préférences » n'a pas d'URL, d'où le clic programmatique de l'étape 19. Si le rythme paraît long en test, on fusionnera les étapes 2 et 3.

---

## 9. Ancres `data-tour` à ajouter (≈ 20)

| Composant | Ancres |
|---|---|
| `DashboardClient` / widgets du tableau de bord | `dashboard-stats`, `dashboard-insights`, `dashboard-vehicles`, `expense-button` (bouton desktop d'`ExpenseButton`) |
| `Header` | `header-filters` (conteneurs desktop et mobile), `global-search` (boutons desktop et mobile) |
| Statistiques | `stats-overview`, `stats-monthly`, `stats-carbon`, `stats-comparison` |
| Dépenses | `expenses-filters`, `expenses-list`, `expenses-csv` |
| Entretiens / Rappels | `maintenance-suggestions`, `reminders-list` |
| Assurance / Garage | `insurance-overview`, `vehicle-health` |
| Famille | `family-vehicles` |
| Paramètres | `settings-preferences` (entrée du menu), `settings-panel` (conteneur du contenu) |

Un test statique vérifie que chaque `target` référencé dans `steps.ts` existe dans le code source.

---

## 10. Correctif assurance (inclus)

**Problème.** `getActiveInsuranceVehicleIds` filtre sur `owner_id = utilisateur courant`.
- Sur le tableau de bord, un véhicule familial assuré par son propriétaire est signalé en **critique** : « Aucun contrat d'assurance actif ».
- La page Assurance, elle, affiche bien ce contrat actif.
- `garage/page.tsx` ne passe que les véhicules personnels à la fonction. En fiche détail, les véhicules familiaux reçoivent donc toujours la pénalité −2 « Assurance ».

**Correctif**
1. Retirer le filtre `.eq('owner_id', user.id)`. Les `vehicleIds` passés sont déjà ceux auxquels l'utilisateur a accès, et la fonction ne renvoie qu'un booléen par véhicule. Mettre à jour son commentaire.
2. `app/(app)/garage/page.tsx` : passer `allVehicleIds` au lieu de `vehicleIds` (branche « famille »).
3. L'équivalent démo suit la sémantique corrigée.

---

## 11. Tests et vérification

**Tests unitaires (Vitest, en TDD).** Ils vivent dans `__tests__/demo/**` et `__tests__/tour/**`.

1. **Graine :**
   - déterminisme ;
   - dates relatives ;
   - stabilité des identifiants entre deux dates ;
   - invariants du §4.5, vérifiés via les vrais utilitaires.
2. **Journal :**
   - aller-retour d'encodage ;
   - version inconnue ou contenu corrompu → journal vide ;
   - plafond de taille → 409 ;
   - rejeu déterministe des identifiants.
3. **Reducers et handlers**, pour chaque endpoint de §6 :
   - chemin nominal : forme de la réponse et effet sur l'état ;
   - erreurs : 400 pour un champ manquant, 403 pour un droit insuffisant ou une mensualité d'assurance, 404 ;
   - effets des triggers : odomètre, rappel d'entretien, récurrence, mensualités, cascade de suppression.
4. **Vues :** `calculated_consumption`, `last_fill_date`, `family_ids`, `permission_level`, mensualités dérivées.
5. **Sécurité :** pour chacune des 24 fonctions de `lib/data`, en mode démo (`next/headers` mocké), `createSupabaseServerClient` n'est **jamais** appelé (espion via `vi.mock`).
6. **Middleware :**
   - avec cookie, `/api/x` est réécrit vers `/api/demo/x` ;
   - `/api/demo/*` n'est pas réécrit ;
   - les pages passent ;
   - sans cookie, le comportement est inchangé.
7. **Visite :**
   - reducer : transitions, bornes, chapitres, pause et reprise, changement de `sessionId` ;
   - `placement` : retournement quand la place manque, maintien dans le viewport, feuille ancrée en bas sur mobile ;
   - existence de chaque ancre ;
   - rendu de la bulle et de ses boutons, raccourcis clavier, repli en carte centrée sans cible.
8. **Correctif assurance :** test de la fonction corrigée (Supabase mocké).

**Vérification avant de déclarer le travail terminé**
- `npx tsc --noEmit` : 0 erreur hors `__tests__`, comme aujourd'hui.
- `npx eslint . --ext .ts,.tsx` et `npx prettier --check` sur les fichiers modifiés.
- `npm run build` réussit.
- `npm run test` : les nouveaux tests passent, et l'on compte **exactement 22 échecs**, tous préexistants.
- Parcours manuel sur le serveur de dev, en desktop puis en viewport mobile :
  1. landing, puis « Essayer la démo » ;
  2. carte d'accueil, puis visite complète, en testant Précédent, Passer, la pause par navigation manuelle et la reprise ;
  3. ajout d'un plein et vérification que le tableau de bord change ;
  4. rappel terminé et vérification de l'occurrence suivante ;
  5. changement de tarif d'assurance ;
  6. tentative d'ajout sur la 208, qui doit être refusée (403) ;
  7. réinitialisation, puis sortie ;
  8. vérification qu'une vraie connexion fonctionne toujours.

---

## 12. Constats hors périmètre (pour un chantier séparé)

1. **Middleware** : `isPublicPath` laisse passer toutes les routes, si bien que la vérification de session est du code mort. La protection repose sur la redirection d'`AppDataProvider` et sur les contrôles de chaque route API.
2. **`fuel_type`** :
   - le dump SQL (`gasoline|diesel|electric|hybrid`) diverge du formulaire, qui écrit des libellés français ;
   - certains contrôles comparent encore les valeurs anglaises : unité kWh de `VehicleQuickView`, boîte auto forcée dans `VehicleForm`, défaut `'gasoline'` ;
   - `ExpenseButton`, `DashboardClient` et `ExpensesClient` excluent `'Hybride non rechargeable'` des pleins.
   - À vérifier avec `select distinct fuel_type from vehicles;`.
3. **Recharges et contrainte CHECK** : si la contrainte `fills_energy_consistency` du dump est bien en place, `fills/add` et `fills/update` écrivent `liters: 0` pour une recharge et violent la contrainte.
4. **`fills/update` et `fills/delete`** lisent `fills.vehicle_id`, colonne absente du dump. Par ailleurs, le tableau de bord envoie un identifiant de dépense comme identifiant de plein. À vérifier sur la vraie base.
5. **`vehicles/add`** renvoie `vehicle.id`, alors que le client lit `vehicle_id`. Les pièces jointes ajoutées à la création d'un véhicule ne sont donc jamais envoyées.
6. **Mobile** : les pages Tableau de bord et Dépenses n'ont aucun bouton « Ajouter » sous 640 px, car le bouton flottant d'`ExpenseButton` est enfermé dans un conteneur `hidden sm:block` ou `hidden sm:flex`.
7. **`ContextBadge`** ne se masque jamais : il compare `'Ce mois'` à un libellé en minuscules.
8. **Suppression d'un membre de famille** : à cause de la RLS, elle ne supprime rien, mais la route répond succès.
9. **Code mort :**
   - 13 handlers jamais appelés par l'interface ;
   - `components/fill/*` non importé ;
   - lien mort `/history` dans les notes de version ;
   - `Preferences.tsx` est un fichier vide.
10. **Tests** : 22 tests en échec sur `main` (tests obsolètes, par exemple le score santé passé de /100 à /10).

---

## 13. Fichiers impactés

**Nouveaux**

- **Routes :**
  - `app/demo/route.ts` ;
  - `app/api/demo/[...path]/route.ts`, `app/api/demo/reset/route.ts`, `app/api/demo/exit/route.ts`.
- **Cœur de la démo (`lib/demo/`) :**
  - `constants.ts` : cookie, identifiants, limites ;
  - `types.ts` : `DemoState`, `DemoOp` ;
  - `random.ts` ;
  - `seed/*.ts` : persona, véhicules, pleins, entretiens, assurance, rappels, autres ;
  - `journal.ts`, `ops.ts`, `views.ts`, `server.ts`, `data.ts` ;
  - `api/router.ts` et `api/handlers/*.ts` ;
  - `tour/steps.ts`, `tour/reducer.ts`.
- **Composants :**
  - `components/demo/DemoProvider.tsx`, `DemoBanner.tsx`, `WelcomeCard.tsx` ;
  - `components/tour/TourProvider.tsx`, `TourOverlay.tsx`, `TourPopover.tsx`, `useTourTarget.ts`, `placement.ts`.
- **Data :** `lib/data/expenses/getFillExpenses.ts`.
- **Tests :** `__tests__/demo/**`, `__tests__/tour/**`.

**Modifiés**

- **Aiguillage et données :**
  - `middleware.tsx` : branche démo ;
  - les 24 fonctions de `lib/data/**` : garde démo ;
  - `lib/data/expenses/index.ts` ;
  - `app/(app)/reminders/page.tsx` : utilise `getFillExpenses`.
- **Montage de la démo :**
  - `app/(app)/AppDataProvider.tsx` : `DemoProvider` ;
  - `app/(app)/PrivateLayoutContent.tsx` : `DemoBanner`.
- **Authentification et landing :**
  - `app/LandingPageClient.tsx` : bouton « Essayer la démo » et `?mode=signup` ;
  - `components/auth/forms/SignInForm.tsx`, `SignUpForm.tsx` : sortie de démo après succès ;
  - `components/auth/LogoutButton.tsx`.
- **Garde-fous uploads :**
  - `hooks/vehicle/useVehicleImageUpload.tsx` ;
  - `app/(app)/settings/hooks/useAccountActions.tsx` ;
  - `components/common/attachments/AttachmentUploader.tsx`.
- **Correctif assurance :**
  - `lib/data/insurance/getActiveInsuranceVehicleIds.ts` ;
  - `app/(app)/garage/page.tsx`.
- **Visite :** environ 15 composants reçoivent des attributs `data-tour` (§9).
- **Configuration et documentation :**
  - `eslint.config.mjs` : `no-restricted-imports` pour `lib/demo/**` et `app/api/demo/**` ;
  - `CLAUDE.md` : nouvelle section « Mode démo ». Elle précise que tout nouveau fetcher de `lib/data` doit recevoir la garde démo, et toute nouvelle route API appelée par l'UI son handler démo.

---

## 14. Risques et parades

| Risque | Parade |
|---|---|
| La démo diverge quand l'app évolue : nouvelle route ou nouveau fetcher | Section dans `CLAUDE.md` ; 501 explicite pour les endpoints inconnus ; test de sécurité sur tous les fetchers ; types partagés (`Expense`, `Vehicle`…) |
| Les ancres de la visite cassent quand l'UI change | Test statique d'existence des ancres ; repli en carte centrée à l'exécution |
| Plafond du cookie atteint | Message 409 clair, avec « Réinitialiser » dans le bandeau ; deflate possible (×5) |
| Écart entre le « aujourd'hui » du serveur (UTC) et celui du client | Au pire ±1 jour sur des libellés relatifs ; sans conséquence |
| Visiteur qui utilise aussi l'app réelle dans le même navigateur | Sortie de démo à la connexion ; préférences démo avec un `updated_at` ancien ; identifiants de véhicules démo filtrés par `SelectorsContext` |
| Accessibilité de la visite | Focus géré, `role="dialog"`, `aria-live`, clavier, `prefers-reduced-motion` |
