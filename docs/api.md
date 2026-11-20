# API

Routes du collection-service (port 8081) et du notification-service (port 8083). « jeton » désigne le jeton de connexion émis par Keycloak : l'utilisateur est toujours celui du jeton, jamais celui de la requête.

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/categories` | public | Liste des catégories, avec leur illustration |
| `GET /api/collectibles/catalog?category=&search=` | public | Annonces approuvées |
| `POST /api/orders/{id}/review` | acheteur | Note (1 à 5) et commentaire (500 caractères) sur une commande reçue : 403 si ce n'est pas l'acheteur, 404 pour un tiers, 409 si la commande n'est pas reçue ou déjà notée |
| `GET /api/reviews/mine` | jeton | Avis écrits par l'utilisateur |
| `GET /api/sellers/{id}/reviews` | public | Moyenne (au dixième), nombre d'avis et 20 derniers avis d'un vendeur |
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

## Notifications (notification-service)

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/notifications` | jeton | Mes notifications |
| `GET /api/notifications/unread-count` | jeton | Nombre de notifications non lues |
| `POST /api/notifications/{id}/read` | jeton | Marquer une notification comme lue (404 si elle n'est pas la mienne) |
| `POST /api/notifications/read-all` | jeton | Tout marquer comme lu |
