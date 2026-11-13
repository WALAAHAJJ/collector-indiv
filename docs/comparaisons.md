# Comparaison des technologies

Ce document compare des technologies envisagées pour Collector, avec une démonstration pour chaque comparaison. Ce qui n'est pas encore démontré est marqué « à venir ».

## 1. Messagerie entre services : RabbitMQ ou Kafka

### Pourquoi une messagerie

Quand une annonce est publiée ou qu'un prix change, plusieurs choses doivent se produire : prévenir les acheteurs intéressés, alerter la détection de fraude, alimenter l'analyse des ventes. Aujourd'hui, le service des annonces devrait appeler chacun de ces traitements lui-même. Avec une messagerie, il publie **un événement** et les autres services s'y abonnent, sans que le service des annonces les connaisse (voir `docs/architecture.md`).

### Comparaison

| Critère | RabbitMQ | Kafka |
|---|---|---|
| Modèle | Courtier de messages : des files d'attente, alimentées par des échanges qui routent les messages (direct, fanout, topic) | Journal d'événements persistant, découpé en partitions ; chaque consommateur lit à son rythme |
| Sort d'un message lu | Supprimé de la file une fois acquitté | Conservé selon la durée ou la taille configurée, indépendamment de sa lecture |
| Relecture de l'historique | Non, avec les files classiques (les « streams » de RabbitMQ le permettent) | Oui : un nouveau groupe relit depuis le début |
| Ordre | Garanti dans une file à un seul consommateur ; peut être perturbé par plusieurs consommateurs ou des remises en file | Garanti dans une partition ; une clé (ici l'identifiant d'annonce) envoie tous les événements d'une annonce dans la même partition |
| Accusé de réception | Par message (acquittement ou refus), avec remise en file et files de lettres mortes | Par avancement du décalage (offset) ; la gestion des échecs et des réessais est à construire |
| Routage | Riche : un échange de type topic route par motif, par exemple `annonce.publiee.timbres` | Par sujet et par partition ; le filtrage se fait chez le consommateur |
| Montée en charge | Bonne ; on ajoute des consommateurs | Conçu pour de très gros volumes grâce aux partitions |
| Exploitation | Un service avec une interface web de gestion incluse | Un service en mode KRaft (sans ZooKeeper depuis Kafka 4), sans interface de gestion incluse |
| Intégration Spring Boot | Mature (`spring-boot-starter-amqp`) | Mature (`spring-kafka`) |

### Résultats mesurés

Les mêmes cinq scénarios ont été exécutés sur les deux brokers (voir `demos/messaging/README.md`).

**À compléter avec tes propres mesures** : lance la démonstration, puis colle ici le tableau de `demos/messaging/resultats.md` et la consommation de mémoire relevée avec `docker stats --no-stream`.

| Scénario | RabbitMQ | Kafka |
|---|---|---|
| 1. Débit | à mesurer | à mesurer |
| 2. Diffusion à deux services | à mesurer | à mesurer |
| 3. Partage entre deux consommateurs | à mesurer | à mesurer |
| 4. Relecture par un service arrivé après | à mesurer | à mesurer |
| 5. Panne sur un message | à mesurer | à mesurer |
| Mémoire d'un broker au repos | à mesurer | à mesurer |

### Choix provisoire pour Collector

**RabbitMQ** pour les notifications et la détection de fraude, à confirmer avec les mesures :

- le besoin est de **traiter chaque événement une fois, avec reprise en cas d'échec** : l'acquittement par message et la remise en file correspondent exactement au scénario 5 ;
- le routage par motif permet de prévenir les acheteurs selon leurs centres d'intérêt (`annonce.publiee.timbres`) sans code de filtrage ;
- le volume attendu est modéré, et un broker léger avec son interface de gestion est plus simple à exploiter ;
- rien dans ces deux usages n'exige de relire l'historique.

**Kafka reste le candidat pour l'analyse des ventes** demandée à la direction : conserver tous les événements et pouvoir les rejouer (scénario 4) est précisément son atout. On pourra l'ajouter plus tard sans changer le reste, puisque les services ne communiquent que par événements.

Limites de cette comparaison : volumes très faibles, un seul nœud par broker, une seule machine. Elle montre des comportements, pas des performances de production.

## 2. Intégration continue : GitHub Actions ou GitLab CI

À venir. Le même pipeline (lint, tests, analyse, construction des images, scan de sécurité) sera exécuté sur les deux outils, avec une démonstration et un tableau des forces, faiblesses et limites de chacun.

## 3. Autres comparaisons possibles

À venir, selon le temps disponible : environnement Kubernetes local (Kind ou Minikube), serveur d'autorisation (Keycloak ou Auth0).
