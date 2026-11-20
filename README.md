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
| Service de notifications : réception des événements RabbitMQ, une notification par décision sur une annonce et par vente | Fait |
| Keycloak dans Docker Compose (serveur d'identité, realm `collector` importé) | Fait |
| Authentification par Keycloak : les services vérifient les jetons (clés publiques RS256) et le site se connecte par Keycloak | Fait |
| Retrait de la connexion maison du user-service, règles de mot de passe et justification de l'authentification | Fait |
| Notifications : service et sa base dans Docker Compose, job de CI, suivi par Dependabot | Fait |
| Notifications : cloche dans le site (compteur de non lues actualisé toutes les 30 s, liste, marquage comme lue) | Fait |
| Photos des annonces : envoi, remplacement et retrait par le vendeur, affichage dans le catalogue, « Mes annonces » et l'administration | Fait |
| Paiement simulé : achat d'une annonce par carte factice, commission de 5 %, annonce marquée vendue, commandes enregistrées (API et tests) | Fait |
| Paiement : bouton « Acheter », fenêtre de paiement avec le détail du prix, « Mes commandes » (achats, ventes avec commission et gain net) | Fait |
| Paiement : notification au vendeur à chaque vente (événement RabbitMQ `order.paid`, « Vous gagnez 22,00 € ») | Fait |
| Suivi de commande : expédiée par le vendeur, reçue par l'acheteur, avec notification de l'autre partie (`order.shipped`, `order.delivered`) | Fait |
| Données de démonstration : 42 annonces réalistes, sept catégories, six vendeurs fictifs (`DEMO_DATA=true`) | Fait |
| Page de détail d'une annonce avec adresse partageable (`#/annonce/…`), annonces de la même catégorie, bandeau « vendue » | Fait |
| Catalogue enrichi : recherche, tri (prix, nom), filtres par fourchette de prix et par état, pagination de 12 annonces | Fait |
| Favoris : cœur cliquable sur chaque annonce et filtre « Mes favoris » (liste conservée par compte dans le navigateur) | Fait |
| Notes, chat | À faire |
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
 PostgreSQL (5433)       notification-service (8083) : même vérification du jeton
                         │ file RabbitMQ, PostgreSQL (5435)
```

- **Keycloak** : serveur d'identité (comptes, connexion, inscription, rôles, jetons de 5 minutes signés RS256). Le site n'a jamais le mot de passe : la personne le saisit sur la page de Keycloak. Le compte administrateur du site est créé dans Keycloak au premier démarrage à partir de `ADMIN_USERNAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
- **collection-service** : annonces, modération automatique, catalogue public. Il vérifie la signature du jeton de Keycloak avec ses clés publiques, puis prend le propriétaire (`sub`) et le rôle (`realm_access.roles`) dans le jeton, jamais dans le formulaire.
- **notification-service** (port 8083, base PostgreSQL dédiée sur 5435) : notifications de chaque utilisateur. Il vérifie le même jeton JWT et ne renvoie que les notifications du propriétaire du jeton ; une notification d'un autre utilisateur répond « introuvable ». Il consomme les événements RabbitMQ du service des annonces (file `notification.listing-events`) et en fait des notifications en français.
- **frontend** : React, TypeScript et Vite. En développement, Vite redirige `/api/collectibles`, `/api/categories`, `/api/orders` et `/api/admin` vers le collection-service, `/api/notifications` vers le notification-service ; la connexion passe directement par Keycloak.

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

Ports utilisés : 5173 (site), 8081 (annonces), 5433 (base des annonces), 5434 (base de Keycloak), 8083 (notifications), 5435 (base des notifications), 5672 (RabbitMQ), 15672 (interface de RabbitMQ, identifiants de `.env`) et 8180 (Keycloak : `http://localhost:8180`, compte `KEYCLOAK_ADMIN_USER` du fichier `.env`).

### Annonces de démonstration

Pour présenter le site avec un catalogue rempli, mettre `DEMO_DATA=true` dans le fichier `.env` avant `docker compose up -d --build` (ou `docker compose up -d collection-service` si les conteneurs existent déjà). Le service des annonces crée alors 42 annonces réparties en sept catégories (les quatre de départ, plus « Vinyles », « Figurines » et « Livres anciens »), au nom de six vendeurs fictifs. Elles passent par la modération habituelle : une annonce à 5 400 € reste en attente et apparaît dans l'écran « Administration ». Le chargement n'a lieu qu'une fois ; pour tout recommencer, supprimer le volume de la base des annonces (`docker compose down -v`). Désactivé par défaut, jamais actif dans les tests des autres fonctions.

### Compte administrateur

Keycloak crée le compte administrateur du site au premier démarrage à partir de `ADMIN_USERNAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD` du fichier `.env` (les trois sont obligatoires). Si le compte existe déjà, la configuration n'est pas relue : pour la reprendre, supprimer le volume `collector-indiv_keycloak-db-data`. L'inscription publique ne donne jamais le rôle administrateur. La console de Keycloak est sur `http://localhost:8180` (compte `KEYCLOAK_ADMIN_USER` du fichier `.env`).

## API

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/categories` | public | Liste des catégories, avec leur illustration |
| `GET /api/collectibles/catalog?category=&search=` | public | Annonces approuvées |
| `GET /api/collectibles/catalog/{id}` | public | Fiche d'une annonce approuvée ou vendue (404 si en attente, refusée ou inconnue) |
| `POST /api/collectibles` | jeton | Déposer une annonce |
| `GET /api/collectibles?ownerId=` | jeton | Mes annonces (uniquement les siennes) |
| `GET /api/collectibles/{id}` | jeton | Une annonce approuvée, ou la sienne |
| `PUT` / `DELETE /api/collectibles/{id}` | jeton | Modifier ou supprimer sa propre annonce |
| `POST` / `DELETE /api/collectibles/{id}/photo` | jeton | Ajouter, remplacer ou retirer la photo de sa propre annonce (JPEG, PNG ou WebP, 1 Mo au maximum) |
| `GET /api/collectibles/{id}/photo` | public si l'annonce est approuvée, sinon propriétaire ou administrateur | Lire la photo d'une annonce |
| `POST /api/orders` | jeton | Acheter une annonce approuvée avec une carte simulée (402 si la carte est refusée, 409 si déjà vendue, 403 pour sa propre annonce) |
| `GET /api/orders/purchases` | jeton | Mes achats |
| `GET /api/orders/sales` | jeton | Mes ventes, avec la commission et mon gain net |
| `POST /api/orders/{id}/ship` | jeton | Le vendeur marque la commande expédiée (403 si ce n'est pas le vendeur, 409 si pas dans l'état « payée ») |
| `POST /api/orders/{id}/deliver` | jeton | L'acheteur confirme la réception (403 si ce n'est pas l'acheteur, 409 si pas encore expédiée) |
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

## Paiement simulé

Aucun argent ne bouge : la passerelle de paiement est une simulation, mais elle applique les vrais contrôles d'une carte.

- **Commission** : 5 % du prix de l'objet (réglable par `app.payment.commission-rate`), arrondie au centime. Le port revient au vendeur. Pour un objet à 20,00 € avec 3,00 € de port : l'acheteur paie 23,00 €, le site garde 1,00 €, le vendeur reçoit 22,00 €.
- **Cartes de test** : `4242 4242 4242 4242` est acceptée ; `4000 0000 0000 0002` est toujours refusée ; un numéro dont la clé de Luhn est fausse ou une date dépassée est refusé.
- **Achat atomique** : l'annonce est verrouillée, payée, marquée vendue et la commande enregistrée dans une seule transaction. Un paiement refusé ne change rien. Deux acheteurs simultanés : le second reçoit une erreur 409.
- **Données de carte** : jamais enregistrées ni journalisées ; la commande garde seulement les 4 derniers chiffres.
- **Notification de vente** : une fois l'achat validé, le service des annonces publie `order.paid` sur RabbitMQ ; le vendeur reçoit dans sa cloche « Bonne nouvelle : « … » est vendu ! Vous gagnez 22,00 € ». L'envoi attend la fin de la transaction : un achat annulé ne prévient personne.
- **Notifications de suivi** : quand le vendeur expédie, l'acheteur reçoit « Votre commande « … » a été expédiée » (`order.shipped`) ; quand l'acheteur confirme la réception, le vendeur est prévenu (`order.delivered`). Même principe : envoi après validation de la transaction, et un RabbitMQ arrêté ne bloque pas la commande.
- Une annonce vendue quitte le catalogue et ne peut plus être modifiée, supprimée ni remise en vente.

Catalogue : la recherche et la catégorie sont traitées par l'API (`category`, `search`) ; le tri (pertinence, prix croissant ou décroissant, nom), le filtre de prix minimum et maximum, le filtre d'état et la pagination (12 annonces par page) sont appliqués dans le navigateur, par des fonctions pures testées (`frontend/src/catalogue.ts`). Les favoris sont enregistrés dans le navigateur (`localStorage`), une liste par compte : ils ne suivent pas l'utilisateur d'un appareil à l'autre. Un stockage dans une table de l'API serait l'étape suivante. Choix assumé pour le tri : à l'échelle de quelques centaines d'annonces c'est instantané et sans appel réseau ; au-delà de plusieurs milliers, il faudrait déplacer le tri et la pagination dans l'API (`page`, `size`, `sort`).

Dans le site : « Voir le détail » ouvre la page de l'annonce (adresse `#/annonce/<identifiant>`, copiable). Sur cette page, un visiteur voit « Se connecter pour acheter », le vendeur voit « C'est votre annonce », un autre utilisateur ouvre la fenêtre de paiement. Après l'achat, l'objet disparaît du catalogue, sa page affiche « Cette annonce a été vendue » et la commande apparaît dans « Mes commandes ».

Suivi : dans « Mes commandes », chaque commande affiche son étape (payée, expédiée, reçue). Le vendeur voit « Marquer comme expédiée » sur l'onglet « Mes ventes » ; l'acheteur voit « J'ai reçu mon colis » sur l'onglet « Mes achats » une fois la commande expédiée. Chacun est prévenu par la cloche de notifications.

## Tests et qualité

```bash
# Chaque service Java
cd backend/microservices/collection-service && ./mvnw -B verify
cd backend/microservices/notification-service && ./mvnw -B verify

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
| Scan de sécurité (Trivy) | dépendances, secrets et configuration ; fait échouer la CI sur une faille haute ou critique |

Dependabot propose chaque semaine des mises à jour Maven, npm, Docker et GitHub Actions. Le projet reste en Java 21, version à support long.

## Sécurité

- Authentification déléguée à Keycloak (SSO, code d'autorisation avec PKCE) : mots de passe jamais vus par le site, politique de mot de passe, blocage après 5 échecs, jetons RS256 de 5 minutes à renouvellement tournant. Justification dans [docs/securite.md](docs/securite.md).
- API sans état ; seuls le catalogue et les fiches d'annonces approuvées ou vendues sont publics (une annonce en attente ou refusée répond 404).
- Contrôle du propriétaire côté serveur sur toutes les opérations d'écriture.
- Identifiants validés (UUID) avant de construire les URL côté frontend.
- Secrets hors du dépôt : le fichier `.env` n'est pas versionné, `.env.example` documente les variables, `SONAR_TOKEN` est un secret GitHub.
- Conteneurs exécutés avec un utilisateur sans privilèges.

La démarche complète (risques, détection, incidents) est décrite dans [docs/securite.md](docs/securite.md).

## Structure du dépôt

```
backend/microservices/notification-service notifications
keycloak                                  configuration du realm (SSO)
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

