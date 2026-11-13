# Résultats de la démonstration

Mesurés le 2026-11-13 sur la machine de développement.

| Scénario | RabbitMQ | Kafka |
|---|---|---|
| 1. Débit (2000 messages, un consommateur) | 16630 messages/s (120 ms) | 16769 messages/s (119 ms) |
| 2. Diffusion à deux services (200 messages) | notifications 200, fraude 200 | notifications 200, fraude 200 |
| 3. Partage entre deux consommateurs (200 messages) | A 100, B 100, total 200 | A 70, B 130, total 200 |
| 4. Relecture par un service arrivé après (200 messages déjà publiés) | reçoit 0 sur 200 | reçoit 200 sur 200 |
| 5. Panne sur le message 5 (10 messages) | 2 livraisons du message 5, 1 livraison(s) en trop au total, 10/10 traités | 2 livraisons du message 5, 1 livraison(s) en trop au total, 10/10 traités |
