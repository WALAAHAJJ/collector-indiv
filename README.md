# Collector

**La place de marché des objets de collection du quotidien.**

Collector met en relation des particuliers qui veulent vendre ou trouver des timbres, des pièces, des cartes postales, des cassettes, des vinyles ou des figurines. Pas de luxe ni de brocante : ces objets qui rappellent des souvenirs, vendus en toute confiance.

| Pour les acheteurs | Pour les vendeurs | Pour l'équipe Collector |
|---|---|---|
| Un catalogue à parcourir par catégorie, avec recherche, tri, filtres de prix et d'état, favoris | Un dépôt d'annonce en quelques clics, avec photo, et un suivi de chaque vente | Une modération automatique des annonces et un espace d'administration |
| Un paiement par carte (simulé pour l'instant : aucun argent ne bouge) et le suivi de la commande, de l'achat à la réception | Une commission claire de 5 %, avec le gain net affiché pour chaque vente | Les catégories et les annonces gérées depuis le site |
| Les avis des autres acheteurs sur chaque vendeur | Des notifications à chaque vente, expédition et réception | Une plateforme sécurisée et testée en continu |

Le détail de chaque fonctionnalité est dans [docs/fonctionnalites.md](docs/fonctionnalites.md) et la liste des routes dans [docs/api.md](docs/api.md).

## Architecture

```
 Navigateur ──▶ Frontend React (5173) ── connexion ──▶ Keycloak (8180)
                     │                                      │ jeton signé
                     ▼                                      ▼
              collection-service (8081) ──▶ RabbitMQ ──▶ notification-service (8083)
                     │                                      │
                PostgreSQL (5433)                      PostgreSQL (5435)
```

- **frontend** : React, TypeScript, Vite.
- **collection-service** : annonces, modération, commandes. Spring Boot 4, Java 21.
- **notification-service** : notifications de chaque utilisateur, alimentées par les événements RabbitMQ.
- **Keycloak** : comptes, connexion, rôles, jetons. Chaque service vérifie la signature du jeton.

Chaque service a sa propre base de données. Détails et schémas : [docs/architecture.md](docs/architecture.md).

## Lancer le projet

Prérequis : Docker et Node.js (Java 21 seulement pour lancer les tests hors Docker).

```bash
cp .env.example .env            # puis adapter les valeurs
docker compose up -d --build    # bases, RabbitMQ, Keycloak et les deux services
cd frontend
npm ci
npm run dev                     # http://localhost:5173
```

- **Catalogue de démonstration** : mettre `DEMO_DATA=true` dans `.env`, puis `docker compose up -d --build collection-service`. 42 annonces sont créées une seule fois.
- **Compte administrateur** : créé au premier démarrage à partir de `ADMIN_USERNAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD` du fichier `.env`.
- **Carte de test** : `4242 4242 4242 4242` est acceptée, `4000 0000 0000 0002` est refusée.
- **Interfaces** : Keycloak sur `http://localhost:8180`, RabbitMQ sur `http://localhost:15672`.

## Tests et qualité

```bash
cd backend/microservices/collection-service && ./mvnw -B verify
cd backend/microservices/notification-service && ./mvnw -B verify
cd frontend && npm run test:coverage && npm run lint && npm run build
```

À chaque push, la CI (`.github/workflows/ci.yml`) lance le lint, les tests avec couverture, l'analyse SonarCloud (couverture d'au moins 80 % sur le code nouveau), un scan Trivy et le build des images Docker. Dependabot propose chaque semaine les mises à jour. Stratégie complète : [docs/tests.md](docs/tests.md).

## Sécurité

- Authentification déléguée à Keycloak (SSO avec PKCE, jetons de 5 minutes, blocage après 5 échecs).
- API sans état : seuls le catalogue et les fiches d'annonces approuvées ou vendues sont publics.
- Propriétaire contrôlé côté serveur sur toute écriture ; identifiants validés avant de construire une adresse d'API.
- Secrets hors du dépôt (`.env` non versionné), conteneurs sans privilèges.

Démarche complète (risques, détection, incidents) : [docs/securite.md](docs/securite.md).

## Structure du dépôt

```
frontend/                                  site React
backend/microservices/collection-service  annonces, modération, commandes
backend/microservices/notification-service notifications
keycloak/                                  configuration du realm (SSO)
demos/messaging/                           comparaison RabbitMQ et Kafka
docs/                                      documentation détaillée
compose.yaml                               bases de données et services
.github/                                   CI et Dependabot
```

## Documentation

- [Fonctionnalités](docs/fonctionnalites.md) : état d'avancement, modération, paiement, catalogue et suivi de commande.
- [API](docs/api.md) : toutes les routes, avec leurs droits d'accès.
- [Architecture](docs/architecture.md) : composants, flux, décisions et évolutions prévues.
- [Référentiel des outils](docs/outils.md) : outils utilisés, rôle et emplacement.
- [Stratégie de tests](docs/tests.md) : types de tests, place dans la CI/CD.
- [Comparaison des technologies](docs/comparaisons.md) : RabbitMQ contre Kafka.
- [Politique de sécurité](docs/securite.md) et [signalement d'une vulnérabilité](SECURITY.md).

---

Projet réalisé dans le cadre de la formation CESI.
