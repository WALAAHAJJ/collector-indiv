# Comparaison des technologies

Ce document compare les technologies envisagées pour Collector, avec une démonstration mesurée pour chaque comparaison.

## Messagerie entre services : RabbitMQ ou Kafka

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

Les mêmes cinq scénarios ont été exécutés sur les deux brokers, sur une même machine (voir `demos/messaging/README.md` et le détail dans `demos/messaging/resultats.md`).

| Scénario | RabbitMQ | Kafka |
|---|---|---|
| 1. Débit (2 000 messages, un consommateur) | 16 630 messages/s | 16 769 messages/s |
| 2. Diffusion à deux services (200 messages) | notifications 200, fraude 200 | notifications 200, fraude 200 |
| 3. Partage entre deux consommateurs (200 messages) | A 100, B 100 | A 70, B 130 |
| 4. Relecture par un service arrivé après (200 messages déjà publiés) | reçoit 0 sur 200 | reçoit 200 sur 200 |
| 5. Panne sur le message 5 (10 messages) | 2 livraisons du message, 10 traités sur 10 | 2 livraisons du message, 10 traités sur 10 |
| Mémoire d'un broker au repos (`docker stats`) | 146 Mio | 339 Mio |

### Lecture des résultats

- **Débit : à égalité.** À ce volume, les deux brokers donnent le même résultat. Cette mesure ne départage pas les outils, et elle est très au-dessus des besoins de Collector. Elle ne dit rien de ce qui se passerait avec des millions de messages.
- **Diffusion : les deux conviennent.** Les deux services reçoivent chacun tous les messages, par des mécanismes différents (une file par service chez RabbitMQ, un groupe de consommateurs par service chez Kafka).
- **Partage : RabbitMQ répartit plus régulièrement.** Chez RabbitMQ, chaque message va au consommateur disponible, d'où 100 et 100. Chez Kafka, la répartition suit les partitions : avec deux partitions et des clés d'annonce, l'un des consommateurs a reçu 70 messages et l'autre 130. Le nombre de consommateurs utiles est limité par le nombre de partitions.
- **Relecture : c'est la vraie différence.** Un service qui arrive après la publication ne reçoit rien de RabbitMQ (les messages lus ont disparu) mais retrouve les 200 messages chez Kafka.
- **Panne : même résultat sur ce cas simple.** Dans les deux cas, le message en échec est livré une seconde fois et aucun message n'est perdu. Les mécanismes diffèrent : RabbitMQ remet le message en file sur refus explicite, Kafka relit parce que le décalage n'a pas avancé. Un message qui échoue toujours (message « empoisonné ») n'a pas été testé : RabbitMQ peut l'envoyer vers une file de lettres mortes, alors que chez Kafka ce mécanisme est à construire.
- **Mémoire : Kafka consomme environ 2,3 fois plus** (339 Mio contre 146 Mio) pour un seul nœud au repos.

### Choix pour Collector

**RabbitMQ** pour les notifications et la détection de fraude. Les mesures confirment le choix provisoire :

- le débit et la diffusion sont équivalents, donc rien ne justifie un broker plus lourd ;
- il est **deux fois et demie plus léger** en mémoire, et il répartit le travail plus régulièrement entre consommateurs ;
- le traitement d'un événement avec reprise en cas d'échec est exactement ce qu'il propose nativement (acquittement par message, remise en file, lettres mortes) ;
- le routage par motif permet de prévenir les acheteurs selon leurs centres d'intérêt (`annonce.publiee.timbres`) sans code de filtrage ;
- ces deux usages n'ont pas besoin de relire l'historique.

**Kafka reste le candidat pour l'analyse des ventes** demandée à la direction : conserver tous les événements et pouvoir les rejouer (scénario 4) est précisément son atout. On pourra l'ajouter plus tard sans changer le reste, puisque les services ne communiquent que par événements.

Limites de cette comparaison : volumes très faibles, un seul nœud par broker, une seule machine. Elle montre des comportements, pas des performances de production.


## Authentification : solution maison, Keycloak ou Authentik

Le site doit identifier les personnes (acheteurs, vendeurs, administrateurs) sans jamais exposer leurs mots de passe. Trois options ont été étudiées. Le projet a d'abord utilisé la première, puis est passé à la deuxième.

| Critère | Solution maison (ancien user-service) | Keycloak | Authentik |
|---|---|---|---|
| Standards | Jeton maison, aucun standard d'identité | OpenID Connect, OAuth 2.0, SAML | OpenID Connect, OAuth 2.0, SAML |
| Connexion unique (SSO) | Non | Oui | Oui |
| Mots de passe | Hachés par le projet (BCrypt), saisis sur le site | Saisis et hachés par Keycloak, jamais vus par le site | Idem |
| Protection contre les essais répétés, politique de mot de passe, double authentification | À écrire et à maintenir | Fournies par configuration | Fournies par configuration |
| Compte administrateur et rôles | Code du projet | Rôles du realm, importés depuis un fichier versionné | Groupes et politiques |
| Clés de signature | Un secret partagé entre services (HS256) | Paire de clés : les services ne connaissent que la clé publique (RS256) | Idem |
| Maturité et écosystème | Aucune | Très répandu en entreprise, projet de la CNCF, très documenté | Plus récent, interface moderne, communauté plus petite |
| Charge d'exploitation | Aucune de plus, mais toute la sécurité à la charge du projet | Un conteneur et sa base | Plusieurs conteneurs (serveur, worker) et une base |
| Intégration Spring Boot | Code maison | Resource server standard (`jwk-set-uri`) | Resource server standard |

### Choix : Keycloak

- **Ne pas écrire sa propre sécurité** : stocker des mots de passe, limiter les essais, renouveler les jetons sont des fonctions où une erreur de détail devient une faille. Keycloak est éprouvé et mis à jour par une large communauté.
- **Standards** : OpenID Connect avec code d'autorisation et PKCE (S256), c'est la méthode recommandée pour une application web publique. Le site ne manipule jamais de mot de passe.
- **Réduction de la surface d'attaque** : plus de secret partagé entre services ; chaque service vérifie la signature avec la clé publique, ce qui permet d'ajouter des services sans leur confier de secret.
- **Reproductible** : la configuration est un fichier versionné (`keycloak/realm-collector.json`), importé au démarrage ; aucun mot de passe n'est écrit dans le dépôt.
- **Authentik** aurait convenu techniquement. Keycloak a été préféré pour sa maturité, sa documentation abondante et son empreinte plus simple à faire tourner en local.

Limites assumées : Keycloak est un composant lourd (environ 1 Go de mémoire) et son mode `start-dev` utilisé ici n'est pas destiné à la production (HTTPS, hôte public et base dédiée seraient à configurer).

### Questions probables du jury

- *Pourquoi ne pas avoir gardé la connexion maison ?* Elle fonctionnait, mais la sécurité des comptes aurait reposé entièrement sur du code écrit par une seule personne ; un serveur d'identité apporte standards, protections et maintenance.
- *Que se passe-t-il si un jeton est volé ?* Il expire en 5 minutes, il est gardé en mémoire (pas dans le stockage du navigateur) et le renouvellement est à usage unique (rotation) : un jeton de renouvellement rejoué est refusé.
- *Comment un service sait-il que le jeton est authentique ?* Il vérifie la signature RS256 avec la clé publique de Keycloak, l'émetteur et la date d'expiration.
- *Comment devient-on administrateur ?* Uniquement par le compte créé au démarrage depuis `.env` ou par un administrateur dans Keycloak ; l'inscription publique ne donne jamais ce rôle.
