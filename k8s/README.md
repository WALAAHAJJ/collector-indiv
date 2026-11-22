# Déploiement Kubernetes

Les mêmes services que `compose.yaml`, décrits pour Kubernetes. Les images viennent de GitHub Container Registry
(`ghcr.io/walaahajj/collector-indiv/...`), publiées par le workflow CD.

| Fichier | Contenu |
|---|---|
| `namespace.yaml` | espace de noms `collector` |
| `config.yaml` | réglages (annonces de démonstration) |
| `databases.yaml` | 4 bases PostgreSQL (StatefulSet + volume de 1 Go chacune) |
| `rabbitmq.yaml` | RabbitMQ |
| `keycloak.yaml` | Keycloak (le realm est importé depuis un ConfigMap) |
| `services.yaml` | collection-service, notification-service, payment-service |
| `frontend.yaml` | interface web |

Chaque service a une sonde de démarrage, de disponibilité et de vie (`/actuator/health`), des limites de mémoire
et des capacités Linux retirées.

## Lancer sur sa machine

Prérequis : un cluster local (Docker Desktop avec Kubernetes activé, minikube ou kind) et `kubectl`.
Les images doivent être publiques sur GitHub (Packages, réglage de visibilité).

```bash
# 1. Espace de noms, secrets (mêmes valeurs que le fichier .env) et realm Keycloak
kubectl apply -f k8s/namespace.yaml
kubectl -n collector create secret generic collector-secrets --from-env-file=.env
kubectl -n collector create configmap keycloak-realm --from-file=keycloak/realm-collector.json

# 2. Tout le reste
kubectl apply -k k8s

# 3. Suivre le démarrage (2 à 3 minutes)
kubectl -n collector get pods -w

# 4. Ouvrir le site (deux terminaux)
kubectl -n collector port-forward svc/frontend 5173:5173
kubectl -n collector port-forward svc/keycloak 8180:8080
```

Le site est alors sur http://localhost:5173 et Keycloak sur http://localhost:8180, comme avec Docker Compose.

## Commandes utiles

```bash
kubectl -n collector scale deployment/payment-service --replicas=3   # monter en charge
kubectl -n collector logs deploy/collection-service                  # journaux
kubectl -n collector rollout restart deploy/collection-service       # redémarrer avec la dernière image
kubectl delete namespace collector                                   # tout supprimer
```

## Limites assumées

- Keycloak tourne en mode développement (HTTP), comme dans Compose.
- Le serveur du front est celui de Vite (développement) ; une version de production passerait par nginx.
- Le service des annonces reste à une seule copie : les annonces de démonstration ne doivent être créées qu'une fois.
