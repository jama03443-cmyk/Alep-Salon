# Alep Salon PWA

Site public React/Vite avec réservation, programme de fidélité et administration Supabase.

## Installation

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`. La clé `anon` est publique et protégée par les politiques RLS. N’ajoutez jamais une clé `service_role` aux variables `VITE_*`.

## Déployer sur Vercel

Le dépôt contient le site dans le dossier `alep`. Lors de l’import dans Vercel :

1. Sélectionnez le dépôt `jama03443-cmyk/Alep-Salon`.
2. Réglez **Root Directory** sur `alep`.
3. Ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans **Environment Variables** pour Production et Preview.
4. Déployez. La configuration Vercel utilise `npm run build`, publie `dist` et redirige les routes React vers `index.html`.

Après le premier déploiement, ajoutez le domaine Vercel de production aux URL de redirection autorisées dans **Supabase → Authentication → URL Configuration**. La connexion Google fidélité revient sur `/fidelite`.

## Configurer Supabase

Pour une nouvelle base Supabase, exécutez chaque script une fois dans le SQL Editor, dans cet ordre :

1. `schema.sql`
2. `loyalty-migration.sql`
3. `availability-migration.sql`
4. `barbers-availability-migration.sql`
5. `reservation-status-migration.sql`
6. `delete-client-reservation-migration.sql`
7. `instant-booking-migration.sql`
8. `booking-time-validation-migration.sql`
9. `service-images-migration.sql`
10. `hero-image-migration.sql`
11. `loyalty-program-settings-migration.sql`
12. `loyalty-steps-migration.sql`
13. `loyalty-reward-auto-reset-migration.sql`
14. `clear-client-records-migration.sql`
15. `admin-push-notifications-migration.sql` (voir la configuration Push ci-dessous)

`loyalty-first-login-fix.sql` est un script de réparation pour les anciennes bases dont la procédure de première connexion fidélité n’a pas été mise à jour. La version actuelle de cette procédure est déjà incluse dans `loyalty-migration.sql`, donc ce correctif ne sert pas lors d’une nouvelle installation.

Pour une base déjà utilisée, ne relancez pas toute la liste : exécutez seulement les migrations qui n’y ont pas encore été appliquées. Pour activer la remise à zéro automatique après une récompense, une base ayant déjà les réglages fidélité doit uniquement recevoir `loyalty-reward-auto-reset-migration.sql`.

### Notifications de réservation sur le téléphone Admin

Les notifications Push demandent une autorisation distincte sur chaque téléphone. Connectez-vous au PWA Admin, ouvrez l’onglet **Réservations**, puis touchez **Activer les notifications**. Sur Android, acceptez la demande de Chrome. L’autorisation du navigateur et l’inscription de l’appareil sont requises pour recevoir les alertes lorsque l’application est fermée.

Configurez une seule paire VAPID pour le projet et conservez-la :

```sh
npx web-push generate-vapid-keys --json
```

Dans **Vercel → Settings → Environment Variables**, ajoutez `VITE_WEB_PUSH_PUBLIC_KEY` avec la clé publique. Dans **Supabase → Edge Functions → Secrets**, ajoutez :

- `VAPID_PUBLIC_KEY` : la même clé publique.
- `VAPID_PRIVATE_KEY` : la clé privée, gardée côté serveur.
- `VAPID_SUBJECT` : une adresse de contact au format `mailto:...`.
- `BOOKING_PUSH_SECRET` : un secret aléatoire long.

Activez l’extension `pg_net` dans **Supabase → Database → Extensions**. Dans le SQL Editor, enregistrez l’URL du projet, sa clé anon/publishable et le même secret de webhook dans Vault (remplacez les valeurs entre chevrons) :

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'alep_supabase_url');
select vault.create_secret('<clé anon ou publishable>', 'alep_supabase_anon_key');
select vault.create_secret('<même secret que BOOKING_PUSH_SECRET>', 'alep_booking_push_secret');
```

Exécutez ensuite `admin-push-notifications-migration.sql`, puis déployez la fonction Edge depuis le dossier `alep` :

```sh
supabase functions deploy notify-admin-booking
```

La migration crée une inscription sécurisée par compte Admin et un déclencheur sur les nouvelles réservations. La fonction Edge envoie alors une notification à chaque téléphone Admin inscrit. La clé privée VAPID et le secret de webhook ne doivent jamais être ajoutés aux variables `VITE_*` ni au dépôt.

Créez ensuite un compte dans Supabase Auth, puis attribuez-lui le rôle admin avec son UUID :

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

## Routes

- `/` : site public et réservations.
- `/admin-portal` : connexion admin.
- `/admin-dashboard` : tableau de bord réservé aux admins.
- `/fidelite` : connexion Google et carte de fidélité.

Les informations publiques utilisent des valeurs locales de secours si Supabase n’est pas configuré. Les réservations exigent Supabase et des créneaux actifs configurés pour un barbier.
