# Référentiel des outils

Ce document liste tous les outils, langages et services utilisés dans Collector, ce que chacun fait et où on le trouve dans le dépôt. Les versions sont celles du projet au moment de la rédaction. La dernière partie recense ce qui est prévu mais pas encore en place.

## Sommaire

1. [Langages et frameworks](#1-langages-et-frameworks)
2. [Données et sécurité applicative](#2-données-et-sécurité-applicative)
3. [Tests et qualité du code](#3-tests-et-qualité-du-code)
4. [Intégration continue et livraison](#4-intégration-continue-et-livraison)
5. [Conteneurs](#5-conteneurs)
6. [Sécurité automatisée](#6-sécurité-automatisée)
7. [Gestion du code et du travail](#7-gestion-du-code-et-du-travail)
8. [Interface et design](#8-interface-et-design)
9. [Démonstrations](#9-démonstrations)
10. [Prévu, pas encore en place](#10-prévu-pas-encore-en-place)

## 1. Langages et frameworks

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| Java (Temurin) | 21 | Langage des services. Version à support long, choisie pour la stabilité. | `backend/` |
| Spring Boot | 4.1.2 | Framework des microservices : serveur web, injection de dépendances, configuration. | `backend/microservices/*/pom.xml` |
| Spring Web MVC | via Spring Boot | Écrit les routes de l'API REST (`@RestController`). | contrôleurs des deux services |
| Maven et son wrapper `mvnw` | wrapper fourni | Compile, teste et empaquette. Le wrapper évite d'installer Maven. | `mvnw` dans chaque service |
| React | 19.2 | Construit l'interface en composants. | `frontend/src` |
| TypeScript | 6.0 | Ajoute des types à JavaScript pour repérer les erreurs avant l'exécution. | `frontend/` |
| Vite | 8 | Serveur de développement, build de production et proxy vers les deux services. | `frontend/vite.config.ts` |
| Node.js | 24 (CI) | Exécute Vite, les tests et le lint. | `.github/workflows/ci.yml` |

## 2. Données et sécurité applicative

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| PostgreSQL | 17 | Base de données de chaque service (une base par service). | `compose.yaml` |
| Spring Data JPA et Hibernate | via Spring Boot | Lit et écrit les entités sans écrire de SQL à la main. | `domain/` et `repository/` |
| H2 | via Spring Boot | Base en mémoire utilisée uniquement par les tests. | dépendance de test |
| Bean Validation | via Spring Boot | Valide les formulaires côté serveur (prix positif, champs obligatoires). | DTO des services |
| Spring Security | via Spring Boot | Protège les routes et ne laisse publiques que l'inscription, la connexion et le catalogue. | `SecurityConfig` |
| BCrypt | via Spring Security | Hache les mots de passe : ils ne sont jamais stockés en clair. | `user-service` |
| JWT (Nimbus, resource server) | via Spring Security | Jeton signé HS256 de 15 minutes émis par le user-service et vérifié par le collection-service. | les deux services |
| Spring Boot Actuator | via Spring Boot | Expose la route de santé des services. | `/actuator/health` |

## 3. Tests et qualité du code

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| JUnit 5 et MockMvc | via Spring Boot | Tests unitaires et tests d'intégration de l'API Java. | `src/test/java` |
| Spring Security Test | via Spring Boot | Simule un utilisateur connecté dans les tests d'API. | tests du collection-service |
| JaCoCo | 0.8.16 | Mesure la part du code Java exécutée par les tests. | `pom.xml`, rapports de CI |
| Vitest | 5.1 | Lance les tests du frontend. | `frontend/tests` |
| Testing Library et jsdom | 16 et 31 | Teste les composants comme le ferait un utilisateur, sans navigateur. | `frontend/tests` |
| Couverture v8 | 5.1 | Mesure la couverture du frontend. | `npm run test:coverage` |
| ESLint, typescript-eslint | 10 et 8 | Repère les erreurs et les mauvaises pratiques dans le code TypeScript. | `eslint.config.js` |
| SonarCloud | service en ligne | Analyse le code, vérifie le Quality Gate (couverture, bugs, vulnérabilités, doublons). | analyse lancée par la CI |
| SonarQube for IDE | extension VS Code | Signale les problèmes de qualité pendant l'écriture. | éditeur |

## 4. Intégration continue et livraison

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| GitHub Actions | service en ligne | Lance automatiquement lint, tests, analyse et build à chaque push. | `.github/workflows/ci.yml` |
| actions/checkout, setup-java, setup-node, upload-artifact | v7, v6, v7, v7 | Étapes standard : récupérer le code, installer Java et Node, conserver les rapports. | `ci.yml` |
| SonarSource/sonarqube-scan-action | 8.4.1 | Envoie l'analyse à SonarCloud depuis la CI. | `ci.yml` |

L'étape Sonar est sautée pour les PR de Dependabot, qui n'ont pas accès aux secrets du dépôt (`if: github.actor != 'dependabot[bot]'`).

La CI compte quatre jobs : frontend, collection-service avec Sonar, user-service, et scan de sécurité.

## 5. Conteneurs

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| Docker | — | Empaquette chaque service avec tout ce qu'il faut pour tourner. | `Dockerfile` de chaque service |
| Docker Compose | — | Lance d'un coup les deux bases PostgreSQL, RabbitMQ et les deux services. | `compose.yaml` |
| RabbitMQ | image `rabbitmq:4-management` | Messagerie entre services : le service des annonces y publie les changements de statut. Interface web sur le port 15672. | `compose.yaml` |
| Spring AMQP | fourni par Spring Boot 4.1.2 | Envoi des messages RabbitMQ depuis le service des annonces. | `collection-service/pom.xml` |
| Images maven:3.9 et eclipse-temurin:21 | 3.9 et 21 | Construction en deux étapes : une image de build, puis une image légère d'exécution. | Dockerfiles |
| postgres:17-alpine | 17 | Image officielle de la base de données. | `compose.yaml` |

## 6. Sécurité automatisée

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| Trivy | 0.70.0 | Cherche des failles dans les dépendances, des secrets oubliés et des erreurs de configuration. Fait échouer la CI sur une faille haute ou critique. | job « Scan de sécurité » |
| Dependabot | service GitHub | Propose chaque semaine des mises à jour des dépendances Maven, npm, Docker et Actions. | `.github/dependabot.yml` |
| Secrets GitHub | service GitHub | Garde le jeton Sonar hors du code. | réglages du dépôt |
| Fichier `.env` non versionné | — | Garde mots de passe et clé JWT hors du dépôt ; `.env.example` documente les variables. | racine du dépôt |

## 7. Gestion du code et du travail

| Outil | À quoi il sert |
|---|---|
| Git | Historique du code, un commit par changement. |
| GitHub | Héberge le dépôt, les pull requests de Dependabot et la CI. |
| GitHub CLI (`gh`) | Commandes dans le terminal : voir les runs de CI, fermer ou fusionner des pull requests. |
| Visual Studio Code | Éditeur de code, avec les extensions Java, SonarQube et Docker. |

## 8. Interface et design

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| Fontsource | 5.3 | Héberge les polices dans l'application : pas d'appel à un serveur de polices externe. | `frontend/src/main.tsx` |
| Fraunces, Caveat, Karla | — | Polices du thème : titres, notes manuscrites, texte courant. | `index.css` |
| Variables CSS | — | Centralisent les couleurs et les polices du thème « Album ». | `frontend/src/index.css` |
| `<dialog>` natif | — | Fenêtres accessibles au clavier et aux lecteurs d'écran. | `frontend/src/Modal.tsx` |

Le thème « Album » (papier kraft, polaroïds, notes manuscrites) a été choisi parmi cinq directions de maquettes comparées.

## 9. Démonstrations

Ces outils servent à comparer des technologies. Ils ne font pas partie du site.

| Outil | Version | À quoi il sert | Où |
|---|---|---|---|
| RabbitMQ | image `rabbitmq:4-management` | Courtier de messages à files et échanges, avec interface web. | `demos/messaging/compose.yaml` |
| Apache Kafka | image `apache/kafka:4.0.2` | Journal d'événements partitionné, en mode KRaft. | `demos/messaging/compose.yaml` |
| amqplib | 2.3 | Client Node.js pour RabbitMQ. | `demos/messaging` |
| KafkaJS | 2.2 | Client Node.js pour Kafka. | `demos/messaging` |

La comparaison et le choix provisoire sont dans [comparaisons.md](comparaisons.md).

## 10. Prévu, pas encore en place

Cette liste évolue avec le projet. Rien ci-dessous n'est utilisé aujourd'hui.

| Outil | Pour quoi faire |
|---|---|
| Réception des événements par les services | Service de notifications (fait : file `notification.listing-events`, liée à l'échange par `listing.*`) ; plus tard, détection de fraude et prix modifié. |
| Prometheus et Grafana | Supervision : métriques et tableaux de bord. |
| Flyway | Migrations de base de données versionnées, à la place de la mise à jour automatique actuelle. |
