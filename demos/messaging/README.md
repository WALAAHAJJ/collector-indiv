# Démonstration : RabbitMQ contre Kafka

Cette démonstration fait passer **les mêmes cinq scénarios** par RabbitMQ et par Kafka, avec les mêmes événements (un « prix modifié » sur une annonce de Collector), pour comparer des comportements mesurés et non des opinions. Elle est indépendante du site : aucun des deux brokers n'est encore branché sur les services.

## Lancer

Il faut Docker et Node.js.

```bash
cd demos/messaging
docker compose up -d     # démarre RabbitMQ (5672) et Kafka (9092)
npm install
npm start                # exécute les cinq scénarios sur les deux brokers
docker compose down -v   # arrête et efface tout
```

Kafka met une vingtaine de secondes à démarrer : si le premier lancement indique que Kafka est injoignable, attends un peu et relance. Pour tester un seul broker : `npm run rabbitmq` ou `npm run kafka`.

Le tableau s'affiche dans le terminal et s'enregistre dans `resultats.md`, que tu peux versionner comme preuve de tes mesures.

## Les cinq scénarios

| Scénario | Question posée | Réponse attendue |
|---|---|---|
| 1. Débit | Combien de messages par seconde de bout en bout avec un consommateur ? | dépend de la machine |
| 2. Diffusion | Deux services indépendants (notifications, fraude) reçoivent-ils chacun tous les messages ? | oui sur les deux, par des mécanismes différents |
| 3. Partage | Deux consommateurs d'un même service se répartissent-ils le travail ? | oui, sans doublon |
| 4. Relecture | Un service qui arrive après la publication retrouve-t-il l'historique ? | c'est la différence de fond entre les deux |
| 5. Panne | Que devient un message dont le traitement échoue une fois ? | il est livré à nouveau |

Les mécanismes mis en jeu :

- **RabbitMQ** : un échange de type fanout alimente une file par service (diffusion) ; plusieurs consommateurs sur la même file se partagent les messages ; le message est supprimé de la file une fois acquitté ; un échec se traite par un refus avec remise en file.
- **Kafka** : le sujet est un journal découpé en partitions ; chaque service est un groupe de consommateurs qui lit à son rythme ; plusieurs consommateurs d'un groupe se répartissent les partitions ; les messages restent disponibles selon la durée de conservation ; un échec laisse le décalage (offset) en place, donc le message est relu.

## Mesurer aussi les ressources

Pendant que les brokers tournent, relève leur consommation :

```bash
docker stats --no-stream
```

Note la mémoire de chaque conteneur dans `docs/comparaisons.md`.

## Remarques

- Les débits dépendent de la machine et de la charge : compare les deux brokers entre eux sur la même machine, jamais avec des chiffres trouvés ailleurs.
- Les scénarios utilisent de petits volumes (de 10 à 2 000 messages) pour rester rapides et lisibles. Ils illustrent des comportements, ils ne remplacent pas un test de charge.
- RabbitMQ propose aussi des « streams » qui conservent l'historique ; cette démonstration utilise des files classiques, le mode habituel.
