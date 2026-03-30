# ⚾ Bénévoles — Challenge de France Baseball 2026

Site de gestion des bénévoles pour le **Challenge de France de Baseball 2026** organisé à Toulouse (19–21 juin 2026).

---

## 🚀 Démarrage rapide

### Option 1 — En local (sans serveur)

Ouvrez simplement `index.html` dans votre navigateur. Aucune installation requise.

```bash
# Ou avec un serveur local (recommandé) :
npx serve .
# puis ouvrez http://localhost:3000
```

### Option 2 — Déploiement sur Netlify

1. Forkez ce repo ou connectez-le à Netlify
2. Netlify détecte automatiquement le fichier `netlify.toml`
3. Le site est publié sans configuration supplémentaire

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/icecat31/Benevole-Baseball-Challenge-France)

---

## 📁 Structure du projet

```
/
├── index.html          # Page d'accueil — créneaux et filtres
├── benevole.html       # Formulaire d'inscription bénévole
├── admin.html          # Interface d'administration (protégée par mot de passe)
├── css/
│   ├── main.css        # Styles globaux (mobile-first, responsive)
│   └── admin.css       # Styles spécifiques à l'administration
├── js/
│   ├── data.js         # Couche d'abstraction données (localStorage → Supabase-ready)
│   ├── slots.js        # Affichage et filtrage des créneaux
│   ├── form.js         # Validation et soumission du formulaire
│   └── admin.js        # Logique du tableau de bord admin
├── netlify.toml        # Configuration Netlify (en-têtes sécurité, cache)
└── README.md
```

---

## ✨ Fonctionnalités

### Site public
- 🏠 **Page d'accueil** — présentation de l'événement, filtres par mission et date
- 📅 **Créneaux disponibles** — affichage en grille avec barre de progression
- 📝 **Formulaire d'inscription** — validation complète, présélection du créneau depuis l'URL
- ✅ **Confirmation** — écran de succès après inscription

### Administration (`/admin.html`)
- 🔐 Accès protégé par mot de passe (MVP)
- 📊 Statistiques en temps réel (inscrits, créneaux disponibles/complets)
- 📋 Tableau des inscriptions avec filtres mission/date
- 📅 Vue par créneau avec la liste des bénévoles
- 📥 Export CSV des inscriptions
- 🗑 Suppression d'inscription avec confirmation

---

## 🎯 Missions disponibles

| Mission | Description |
|---------|-------------|
| 🍺 Buvette | Tenue et service de la buvette |
| 🥪 Sandwichs | Préparation et service des repas |
| ⚾ Terrain | Montage, marquage et rangement |
| 🎉 Animation | Stands enfants, initiation baseball |
| 👋 Accueil | Accueil du public et des équipes |
| 🔧 Autres | Logistique générale, aide polyvalente |

---

## 🔑 Accès admin

**Mot de passe par défaut :** `challenge2026`

> ⚠️ Ce mot de passe est stocké en clair dans `js/data.js` (ligne `defaultAdminPassword`).
> C'est volontaire pour le MVP — changez-le avant mise en production.
> Pour une vraie sécurité, connectez Supabase Auth (voir ci-dessous).

---

## 🗄️ Données

### Stockage actuel (MVP)

Les données (créneaux et inscriptions) sont stockées dans le **localStorage** du navigateur.
- Parfait pour tester et présenter le site
- Les données ne sont pas partagées entre navigateurs/appareils

### Migrer vers Supabase

Dans `js/data.js`, chaque méthode de `DataService` est documentée avec un commentaire `[SUPABASE]`
montrant la requête équivalente. Pour migrer :

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Créez les tables `slots` et `registrations` (voir schéma ci-dessous)
3. Remplacez les fonctions `loadXxxFromStorage` / `saveXxxToStorage` par les appels Supabase
4. Renseignez `CONFIG.supabase.url` et `CONFIG.supabase.anonKey` dans `data.js`

#### Schéma SQL suggéré

```sql
-- Créneaux
create table slots (
  id            text primary key,
  date          date not null,
  start_time    time not null,
  end_time      time not null,
  mission       text not null,
  max_volunteers int not null default 4,
  status        text not null default 'open' check (status in ('open','full','closed')),
  description   text
);

-- Inscriptions
create table registrations (
  id           text primary key,
  first_name   text not null,
  last_name    text not null,
  contact      text not null,
  mission      text not null,
  slot_id      text references slots(id),
  comment      text,
  submitted_at timestamptz default now()
);
```

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | HTML5, CSS3, JavaScript vanilla (ES6+) |
| Stockage (MVP) | localStorage |
| Stockage (prod) | Supabase (PostgreSQL) |
| Hébergement | Netlify |
| Build | Aucun — fichiers statiques |

---

## 📱 Compatibilité

- ✅ Mobile-first, responsive (320px → desktop)
- ✅ Chrome, Firefox, Safari, Edge (versions récentes)
- ✅ Accessible (ARIA, labels, contraste)

---

## 🤝 Contribution

Ce projet est destiné au club de baseball de Toulouse pour l'organisation du Challenge de France 2026.
Pour toute modification, ouvrez une issue ou une pull request.

