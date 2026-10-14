# Alep Salon PWA

Site public React/Vite avec réservation, programme de fidélité et administration Supabase.

## Installation

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`. La clé `anon` est publique et protégée par les politiques RLS. N’ajoutez jamais une clé `service_role` aux variables `VITE_*`.

## Initialiser Supabase

Exécutez les migrations dans cet ordre depuis le SQL Editor du projet Supabase :

1. `schema.sql`
2. `loyalty-migration.sql`
3. `availability-migration.sql`
4. `barbers-availability-migration.sql`
5. `reservation-status-migration.sql`
6. `instant-booking-migration.sql`
7. `booking-time-validation-migration.sql`
8. `service-images-migration.sql`
9. `hero-image-migration.sql`
10. `clear-client-records-migration.sql` (nécessaire au bouton de suppression et au nettoyage automatique après sept jours)

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
