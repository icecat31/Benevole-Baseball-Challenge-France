# ⚾ Bénévoles — Challenge de France Baseball 2026

Application web statique de gestion des bénévoles pour le **Challenge de France de Baseball 2026** à Toulouse.

## Objectif

Permettre à des bénévoles de créer un compte, se connecter, enregistrer leurs disponibilités par créneau, et permettre à un administrateur de consulter, filtrer et supprimer les inscriptions.

## Fonctionnalités essentielles

### Côté public
- Page d’accueil avec présentation de l’événement et aperçu des disponibilités.
- Filtrage des créneaux par mission et par date.
- Vue calendrier des disponibilités par jour et par horaire.
- Formulaire de création de compte bénévole.
- Connexion bénévole par email/téléphone et mot de passe.
- Ajout d’une disponibilité avec mission, date, heure de début, heure de fin et note optionnelle.
- Préremplissage possible du formulaire depuis l’URL avec date et mission.
- Confirmation visuelle après ajout ou suppression d’une disponibilité.
- Liste des créneaux existants avec possibilité de rejoindre un créneau.

### Côté administration
- Page admin protégée par mot de passe.
- Tableau des inscriptions avec filtres par mission et par date.
- Vue compacte des disponibilités groupées par jour.
- Statistiques en temps réel sur les inscriptions.
- Export CSV des inscriptions.
- Suppression d’une inscription avec confirmation.

## Règles métier

- Une inscription contient au minimum: prénom, nom, contact, mission, date, heure de début, heure de fin.
- Les missions disponibles sont: Buvette, Préparation sandwichs, Préparation terrain, Activités / Animation, Accueil, Autres missions.
- Les dates autorisées sont du 06/05/2026 au 09/05/2026.
- L’heure de fin doit être strictement après l’heure de début.
- Un bénévole ne peut pas enregistrer deux fois exactement le même créneau.
- Les disponibilités doivent être visibles par tous les utilisateurs.

## Pages du site

- `index.html` : page d’accueil et consultation des créneaux.
- `benevole.html` : inscription, connexion et ajout de disponibilité.
- `admin.html` : administration des inscriptions.

## Structure technique

- Frontend en HTML, CSS et JavaScript vanilla.
- Données partagées via Supabase.
- Site pensé mobile-first et responsive.
- Déploiement possible sur Netlify.

## Données manipulées

- `volunteer_users` : comptes bénévoles.
- `registrations` : disponibilités / inscriptions.
- Les données doivent être partagées entre plusieurs personnes en temps réel via la base distante.

## Prompt prêt à réutiliser

Tu peux utiliser ce résumé comme base pour recréer le site:

> Crée une application web responsive de gestion de bénévoles pour un événement sportif. Le site doit avoir une page d’accueil publique avec vue des créneaux, filtres par mission et date, et affichage des disponibilités partagées. Une page d’inscription doit permettre de créer un compte bénévole, se connecter, puis ajouter des disponibilités avec mission, date, heure de début, heure de fin et commentaire optionnel. Les disponibilités doivent être stockées dans une base de données partagée afin que plusieurs personnes voient les mêmes données. Une page admin protégée doit afficher les inscriptions, permettre le filtrage, l’export CSV et la suppression d’entrées. Les missions sont: Buvette, Préparation sandwichs, Préparation terrain, Activités / Animation, Accueil, Autres missions. Les dates autorisées vont du 06/05/2026 au 09/05/2026.

## Remarque

Le projet est actuellement branché sur Supabase pour les données partagées. Le frontend ne doit pas dépendre du stockage local pour les inscriptions ou les comptes.

