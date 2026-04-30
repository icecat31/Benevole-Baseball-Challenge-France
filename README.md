# ⚾ Bénévoles — Challenge de France Baseball 2026

Site web pour gérer les bénévoles du Challenge de France de Baseball 2026 à Toulouse.
## Version simple

Le site sert à afficher des créneaux de bénévolat, à laisser une personne créer un compte, se connecter avec son prénom et son nom, puis réserver un créneau précis.  
Une personne peut aussi consulter les créneaux disponibles depuis la page d’accueil. L’administration permet de voir les inscriptions, filtrer les données, exporter la liste en CSV et supprimer une inscription si besoin.

Les données sont partagées entre tous les utilisateurs grâce à Supabase. Cela veut dire que si une personne s’inscrit, les autres voient la même information.
## Ce que fait le site

- Page d’accueil avec présentation de l’événement et liste des créneaux.
- Filtrage des créneaux par mission et par date.
- Création de compte bénévole avec prénom, nom, email et téléphone.
- Connexion bénévole avec prénom et nom.
- Réservation d’un créneau défini par l’organisation.
- Affichage des créneaux déjà réservés par la personne connectée.
- Page d’administration protégée par mot de passe.
- Consultation des inscriptions, filtres, export CSV et suppression.
## Règles du projet

- Les créneaux sont fixes et créés à l’avance par l’organisation.
- Un bénévole réserve un créneau existant, il ne crée pas lui-même son horaire.
- Les missions utilisées sont : Restauration, Caisse/Tombola, Terrain, Sono/vidéo, Buvette 1 et Buvette 2.
- Les dates prévues sont du 14/05/2026 au 17/05/2026.
- Un créneau a une capacité maximale.
- Les données doivent être visibles par tous les utilisateurs.

## Pages du site
- `index.html` : page d’accueil et consultation des créneaux.
- `benevole.html` : connexion, création de compte et réservation d’un créneau.
- `compte.html` : gestion et modification des informations du bénévole.
- `admin.html` : tableau de bord d’administration.
## Pour un développeur

### Architecture
- Frontend en HTML, CSS et JavaScript vanilla.
- Base de données partagée via Supabase.
- Site pensé mobile-first et responsive.
- Déploiement possible sur Netlify.

### Fichiers importants
- `js/data.js` : couche d’accès aux données.
- `js/slots.js` : affichage des créneaux sur la page d’accueil.
- `js/form.js` : connexion, inscription et réservation côté bénévole.
- `js/account.js` : consultation et modification du compte bénévole.
- `js/admin.js` : tableau de bord admin.
- `js/supabase-config.js` : configuration publique Supabase chargée dans le navigateur.
- `supabase_slots_seed.sql` : script SQL pour recréer et remplir la base.
### Données manipulées

- `volunteer_users` : comptes bénévoles.
- `slots` : créneaux disponibles.
- `registrations` : réservations des bénévoles.
### Règles techniques

- Le frontend ne doit pas dépendre de `localStorage` pour les données métier.
- Le script `js/supabase-config.js` doit être chargé avant `js/data.js`.
- Les missions et les dates côté frontend doivent correspondre aux valeurs de la base.
- La réservation d’un créneau passe par `slot_id`.
- La table `volunteer_users` contient désormais `first_name`, `last_name`, `email` et `phone`.

## Mise en route
1. Exécuter le script SQL dans Supabase.
2. Vérifier que les données de test et les créneaux sont bien présents.
3. Ouvrir le site dans le navigateur.
4. Vérifier que la page d’accueil affiche les créneaux et que la réservation fonctionne.

## Prompt de reprise
Tu peux utiliser ce résumé pour recréer le site :

> Crée une application web responsive pour gérer les bénévoles du Challenge de France Baseball 2026 à Toulouse. Le site doit avoir une page d’accueil publique qui affiche des créneaux fixes, filtrables par mission et par date. Une page bénévole doit permettre de créer un compte, se connecter avec prénom et nom, puis réserver un créneau existant. Une page admin protégée doit afficher les inscriptions, permettre le filtrage, l’export CSV et la suppression d’une inscription. Les données doivent être partagées entre plusieurs utilisateurs via Supabase. Les missions sont : Restauration, Caisse/Tombola, Terrain, Sono/vidéo, Buvette 1 et Buvette 2. Les dates sont du 14/05/2026 au 17/05/2026.

## Remarque
Le projet repose sur une base distante pour que tout le monde voie les mêmes créneaux et les mêmes inscriptions.

