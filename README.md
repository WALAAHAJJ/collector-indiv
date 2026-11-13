# Collector

Plateforme web de vente d'objets de collection entre particuliers : timbres, pièces, cartes postales, cassettes… Les objets « du quotidien » qui ravivent des souvenirs, hors luxe et brocante classique.

Projet réalisé dans le cadre du bloc **Superviser et assurer le développement des applications logicielles** (CESI). L'entreprise Collector est fictive ; le cahier des charges décrit une commission de 5 % par transaction, des acheteurs et vendeurs inscrits, un back-office administrateur et une exigence de sécurité de premier plan.

## État d'avancement

| Fonctionnalité | État |
|---|---|
| Inscription, connexion, session par jeton JWT | Fait |
| Catalogue public avec recherche et filtre par catégorie | Fait |
| Dépôt, modification et suppression d'annonces (prix, frais de port, état) | Fait |
| Modération automatique des annonces | Fait |
| API protégée : chacun ne modifie que ses propres annonces | Fait |
| Interface accessible (fenêtres natives `<dialog>`, clavier, contrastes) | Fait |
| Back-office administrateur (catégories, validation manuelle) | À faire |
| Photos des annonces | À faire |
| Notifications, chat, paiement par carte et commission de 5 %, notes | À faire |
| Détection de fraude, recommandations, internationalisation | À faire |

Une annonce au prix supérieur à 5 000 € reste en attente de validation manuelle : l'écran d'administration qui la validera n'existe pas encore.

## Architecture

```
 Navigateur
     │
 Frontend React (Vite, port 5173)
     │  /api/auth/*          /api/collectibles/*
     ▼                        ▼
 user-service (8082)     collection-service (8081)
     │                        │
 PostgreSQL (5434)       PostgreSQL (5433)
     └── jetons JWT HS256 signés par user-service, vérifiés par collection-service
```

- **user-service** : comptes, mots de passe hachés avec BCrypt, émission des jetons JWT (15 minutes, rôle `USER` ou `ADMIN` dans le jeton).
- **collection-service** : annonces, modération automatique, catalogue public. Il vérifie la signature du jeton et prend le propriétaire dans le jeton, jamais dans le formulaire.
- **frontend** : React, TypeScript et Vite. En développement, Vite redirige `/api/auth` vers le user-service et `/api/collectibles` vers le collection-service.

Chaque service possède sa propre base de données.

## Lancer le projet

Prérequis : Docker, et Node.js pour le frontend. Java 21 n'est nécessaire que pour lancer les tests des services hors Docker.

```bash
cp .env.example .env            # puis adapter les valeurs si besoin
docker compose up -d --build    # bases de données et deux services
cd frontend
npm ci
npm run dev                     # http://localhost:5173
```

Ports utilisés : 5173 (site), 8081 (annonces), 8082 (comptes), 5433 et 5434 (bases PostgreSQL).

## API

| Route | Accès | Rôle |
|---|---|---|
| `POST /api/auth/register` | public | Créer un compte |
| `POST /api/auth/login` | public | Se connecter, reçoit un jeton |
| `GET /api/auth/me` | jeton | Compte courant |
| `GET /api/collectibles/catalog?category=&search=` | public | Annonces approuvées |
| `POST /api/collectibles` | jeton | Déposer une annonce |
| `GET /api/collectibles?ownerId=` | jeton | Mes annonces (uniquement les siennes) |
| `GET /api/collectibles/{id}` | jeton | Une annonce approuvée, ou la sienne |
| `PUT` / `DELETE /api/collectibles/{id}` | jeton | Modifier ou supprimer sa propre annonce |

## Modération automatique

Chaque annonce créée ou modifiée est contrôlée sans intervention humaine :

- adresse e-mail ou numéro de téléphone dans le titre ou la description : **refusée** (les échanges doivent passer par la plateforme) ;
- terme interdit (contrefaçon, drogue, arme, PayPal, virement, Western Union) : **refusée** ;
- prix supérieur à 5 000 € : **en attente** de validation manuelle ;
- sinon : **approuvée** et visible dans le catalogue.

Les motifs de refus sont affichés au vendeur. La détection du téléphone n'utilise pas d'expression régulière, pour éviter les blocages sur des textes hostiles.

## Tests et qualité

```bash
# Chaque service Java
cd backend/microservices/collection-service && ./mvnw -B verify
cd backend/microservices/user-service && ./mvnw -B verify

# Frontend : tests, couverture, lint et build
cd frontend && npm run test:coverage && npm run lint && npm run build
```

- Java : JUnit et MockMvc, couverture JaCoCo.
- Frontend : Vitest et Testing Library, couverture v8.
- SonarCloud analyse le code et les couvertures ; le Quality Gate impose une couverture d'au moins 80 % sur le code nouveau et les notes A en fiabilité, sécurité et maintenabilité.

## Intégration continue

Le workflow `.github/workflows/ci.yml` s'exécute à chaque push :

| Job | Contenu |
|---|---|
| Frontend | lint, tests avec couverture, build |
| Tests, SonarCloud et Docker | tests du collection-service, tests du frontend, analyse Sonar, build de l'image |
| User service | tests et build de l'image |
| Scan de sécurité (Trivy) | dépendances, secrets et configuration (rapport, sans blocage pour l'instant) |

Dependabot propose chaque semaine des mises à jour Maven, npm, Docker et GitHub Actions. Le projet reste en Java 21, version à support long.

## Sécurité

- Mots de passe hachés (BCrypt), jetons JWT signés et à durée courte.
- API sans état ; seul le catalogue est public.
- Contrôle du propriétaire côté serveur sur toutes les opérations d'écriture.
- Identifiants validés (UUID) avant de construire les URL côté frontend.
- Secrets hors du dépôt : le fichier `.env` n'est pas versionné, `.env.example` documente les variables, `SONAR_TOKEN` est un secret GitHub.

## Structure du dépôt

```
backend/microservices/user-service        comptes et jetons
backend/microservices/collection-service  annonces et modération
frontend                                  site React
compose.yaml                              bases de données et services
.github/workflows/ci.yml                  intégration continue
.github/dependabot.yml                    mises à jour automatiques
```

## Documentation

- [Référentiel des outils](docs/outils.md) : tous les outils utilisés, leur rôle et leur emplacement dans le dépôt.

## Auteure

Walaa EL HAJJ, dans le cadre de l'évaluation individuelle du bloc.
