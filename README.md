# Collector

Plateforme web de vente d'objets de collection entre particuliers : timbres, pièces, cartes postales, cassettes… Les objets « du quotidien » qui ravivent des souvenirs, hors luxe et brocante classique.

Projet (CESI). L'entreprise Collector , le cahier des charges décrit une commission de 5 % par transaction, des acheteurs et vendeurs inscrits, un back-office administrateur et une exigence de sécurité de premier plan.

## État d'avancement

| Fonctionnalité | État |
|---|---|
| Inscription, connexion et session par Keycloak (SSO : code d'autorisation avec PKCE, jeton en mémoire) | Fait |
| Catalogue public avec recherche et filtre par catégorie | Fait |
| Dépôt, modification et suppression d'annonces (prix, frais de port, état) | Fait |
| Modération automatique des annonces | Fait |
| API protégée : chacun ne modifie que ses propres annonces | Fait |
| Interface accessible (fenêtres natives `<dialog>`, clavier, contrastes) | Fait |
| Back-office administrateur : API de validation, de refus et de suppression des annonces | Fait |
| Back-office administrateur : écran « Administration » dans le site (approuver, refuser avec motif, supprimer) | Fait |
| Catégories créées et supprimées par l'administrateur : API, liste publique, catégories par défaut, annonces limitées aux catégories existantes | Fait |
| Catégories dans le site : filtres et formulaires alimentés par l'API, gestion dans l'écran d'administration | Fait |
| Comparaison RabbitMQ et Kafka avec démonstration mesurée (`demos/messaging`) | Fait |
| Événements d'annonces publiés sur RabbitMQ (publiée, refusée, en attente de vérification) | Fait |
| Service de notifications : API des notifications de chaque utilisateur (liste, non lues, marquage comme lue) | Fait |
| Service de notifications : réception des événements RabbitMQ, une notification par décision sur une annonce | Fait |
| Keycloak dans Docker Compose (serveur d'identité, realm `collector` importé) | Fait |
| Authentification par Keycloak : les services vérifient les jetons (clés publiques RS256) et le site se connecte par Keycloak | Fait |
| Retrait de la connexion maison du user-service, règles de mot de passe et justification de l'authentification | À faire |
| Notifications : service dans Docker Compose et la CI, cloche dans le site | À faire |
| Photos des annonces : envoi, remplacement et retrait par le vendeur, affichage dans le catalogue, « Mes annonces » et l'administration | Fait |
| Notifications, chat, paiement par carte et commission de 5 %, notes | À faire |
| Détection de fraude, recommandations, internationalisation | À faire |

Une annonce au prix supérieur à 5 000 € reste en attente de validation manuelle : un administrateur la valide ou la refuse depuis l'écran « Administration » du site.

## Architecture

```
 Navigateur
     │
 Frontend React (Vite, port 5173) ──── connexion ───▶ Keycloak (8180)
     │  /api/collectibles/*                              │ jeton RS256
     ▼                                                   │ (clés publiques)
 collection-service (8081) ◀─────────────────────────────┘
     │
 PostgreSQL (5433)       notification-service : même vérification du jeton
 user-service (8082) : ancienne connexion maison, remplacée par Keycloak (retrait prévu)
```

- **Keycloak** : serveur d'identité (comptes, connexion, inscription, rôles, jetons de 5 minutes signés RS256). Le site n'a jamais le mot de passe : la personne le saisit sur la page de Keycloak. Le compte administrateur du site est créé dans Keycloak au premier démarrage à partir de `ADMIN_USERNAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
- **user-service** : ancienne connexion maison (comptes BCrypt, jetons HS256), plus utilisée par le site ; elle sera retirée à la prochaine livraison.
- **collection-service** : annonces, modération automatique, catalogue public. Il vérifie la signature du jeton de Keycloak avec ses clés publiques, puis prend le propriétaire (`sub`) et le rôle (`realm_access.roles`) dans le jeton, jamais dans le formulaire.
- **notification-service** (pas encore dans Docker Compose ; il y aura le port 8083) : notifications de chaque utilisateur. Il vérifie le même jeton JWT et ne renvoie que les notifications du propriétaire du jeton ; une notification d'un autre utilisateur répond « introuvable ». Il consomme les événements RabbitMQ du service des annonces (file `notification.listing-events`) et en fait des notifications en français.
- **frontend** : React, TypeScript et Vite. En développement, Vite redirige `/api/auth` vers le user-service et `/api/collectibles` vers le collection-service.

Chaque service possède sa propre base de données.

## Lancer le projet

Prérequis : Docker, et Node.js pour le frontend. Java 21 n'est nécessaire que pour lancer les tests des services hors Docker.

```bash
cp .env.example .env            # puis adapter les valeurs si besoin
docker compose up -d --build    # bases de données, RabbitMQ et deux services
cd frontend
npm ci
npm run dev                     # http://localhost:5173 (port imposé : Keycloak n'autorise que celui-ci ; s'il est pris, fermer l'ancien Vite avec `pkill -f vite`)
```

Ports utilisés : 5173 (site), 8081 (annonces), 8082 (comptes), 5433 et 5434 (bases PostgreSQL), 5672 (RabbitMQ), 15672 (interface de RabbitMQ, identifiants de `.env`) et 8180 (Keycloak : `http://localhost:8180`, compte `KEYCLOAK_ADMIN_USER` du fichier `.env`).

### Compte administrateur

Keycloak crée le compte administrateur du site au premier démarrage à partir de `ADMIN_USERNAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD` du fichier `.env` (les trois sont obligatoires). Si le compte existe déjà, la configuration n'est pas relue : pour la reprendre, supprimer le volume `collector-indiv_keycloak-db-data`. L'inscription publique ne donne jamais le rôle administrateur. La console de Keycloak est sur `http://localhost:8180` (compte `KEYCLOAK_ADMIN_USER` du fichier `.env`).

## API

| Route | Accès | Rôle |
|---|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | — | Ancienne connexion du user-service, remplacée par Keycloak (retrait prévu) |
| `GET /api/categories` | public | Liste des catégories, avec leur illustration |
| `GET /api/collectibles/catalog?category=&search=` | public | Annonces approuvées |
| `POST /api/collectibles` | jeton | Déposer une annonce |
| `GET /api/collectibles?ownerId=` | jeton | Mes annonces (uniquement les siennes) |
| `GET /api/collectibles/{id}` | jeton | Une annonce approuvée, ou la sienne |
| `PUT` / `DELETE /api/collectibles/{id}` | jeton | Modifier ou supprimer sa propre annonce |
| `POST` / `DELETE /api/collectibles/{id}/photo` | jeton | Ajouter, remplacer ou retirer la photo de sa propre annonce (JPEG, PNG ou WebP, 1 Mo au maximum) |
| `GET /api/collectibles/{id}/photo` | public si l'annonce est approuvée, sinon propriétaire ou administrateur | Lire la photo d'une annonce |
| `GET /api/admin/collectibles?status=` | administrateur | Annonces par statut (par défaut : en attente) |
| `POST /api/admin/collectibles/{id}/approve` | administrateur | Approuver une annonce |
| `POST /api/admin/collectibles/{id}/reject` | administrateur | Refuser une annonce, avec un motif obligatoire |
| `DELETE /api/admin/collectibles/{id}` | administrateur | Supprimer une annonce contraire à la charte |
| `POST /api/admin/categories` | administrateur | Créer une catégorie (nom unique, illustration) |
| `DELETE /api/admin/categories/{id}` | administrateur | Supprimer une catégorie, refusé si des annonces l'utilisent |

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
- Les analyses Sonar lancées par Dependabot sont ignorées : ses PR n'ont pas accès au secret `SONAR_TOKEN`, l'étape échouerait sans rapport avec le code.
- SonarCloud analyse le code et les couvertures ; le Quality Gate impose une couverture d'au moins 80 % sur le code nouveau et les notes A en fiabilité, sécurité et maintenabilité.

## Intégration continue

Le workflow `.github/workflows/ci.yml` s'exécute à chaque push :

| Job | Contenu |
|---|---|
| Frontend | lint, tests avec couverture, build |
| Tests, SonarCloud et Docker | tests du collection-service, tests du frontend, analyse Sonar, build de l'image |
| User service | tests et build de l'image |
| Scan de sécurité (Trivy) | dépendances, secrets et configuration ; fait échouer la CI sur une faille haute ou critique |

Dependabot propose chaque semaine des mises à jour Maven, npm, Docker et GitHub Actions. Le projet reste en Java 21, version à support long.

## Sécurité

- Mots de passe hachés (BCrypt), jetons JWT signés et à durée courte.
- API sans état ; seul le catalogue est public.
- Contrôle du propriétaire côté serveur sur toutes les opérations d'écriture.
- Identifiants validés (UUID) avant de construire les URL côté frontend.
- Secrets hors du dépôt : le fichier `.env` n'est pas versionné, `.env.example` documente les variables, `SONAR_TOKEN` est un secret GitHub.
- Conteneurs exécutés avec un utilisateur sans privilèges.

La démarche complète (risques, détection, incidents) est décrite dans [docs/securite.md](docs/securite.md).

## Structure du dépôt

```
backend/microservices/user-service        comptes et jetons
backend/microservices/collection-service  annonces et modération
frontend                                  site React
compose.yaml                              bases de données et services
demos/messaging                           démonstration comparative RabbitMQ et Kafka
.github/workflows/ci.yml                  intégration continue
.github/dependabot.yml                    mises à jour automatiques
```

## Documentation

- [Référentiel des outils](docs/outils.md) : tous les outils utilisés, leur rôle et leur emplacement dans le dépôt.
- [Architecture](docs/architecture.md) : composants, responsabilités, flux principaux, décisions et évolutions prévues, avec schémas.
- [Stratégie de tests](docs/tests.md) : types de tests, place dans la CI/CD et ce qui reste à tester.
- [Comparaison des technologies](docs/comparaisons.md) : RabbitMQ contre Kafka, avec démonstration mesurée et choix retenu.
- [Politique de sécurité](docs/securite.md) : inventaire, mesures en place, analyse des risques, gestion des incidents et améliorations déjà réalisées.
- [Signalement d'une vulnérabilité](SECURITY.md) : comment signaler une faille de façon privée.

