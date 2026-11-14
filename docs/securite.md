# Politique de sécurité

Ce document décrit comment Collector protège son code, ses données et ses utilisateurs, et comment cette protection s'améliore au fil du projet. Il distingue ce qui est **en place** de ce qui reste **à faire** : rien n'est annoncé avant d'exister.

Collector manipule des comptes, des échanges entre particuliers et, à terme, des paiements : la sécurité est une exigence de premier plan du cahier des charges.

## 1. Inventaire du parc applicatif

| Composant | Technologie | Rôle | Données sensibles |
|---|---|---|---|
| user-service | Java 21, Spring Boot 4.1.2, port 8082 | Comptes, connexion, jetons | e-mails, mots de passe hachés |
| collection-service | Java 21, Spring Boot 4.1.2, port 8081 | Annonces, modération, back-office | annonces, identifiants de vendeurs |
| frontend | React 19, Vite 8, port 5173 | Site | aucune (jeton en session du navigateur) |
| base des comptes | PostgreSQL 17, port 5434 | Stockage du user-service | comptes |
| base des annonces | PostgreSQL 17, port 5433 | Stockage du collection-service | annonces |
| intégration continue | GitHub Actions | Tests, analyses, build | secret `SONAR_TOKEN` |
| analyse de qualité | SonarCloud | Qualité et sécurité du code | aucune |
| scan de sécurité | Trivy | Dépendances, secrets, configuration | aucune |
| mises à jour | Dependabot | Dépendances Maven, npm, Docker, Actions | aucune |

Chaque nouveau composant (broker de messages, orchestrateur, base de supervision) sera ajouté à ce tableau avant sa mise en service.

## 2. Mesures en place

| Domaine | Mesure | Où |
|---|---|---|
| Mots de passe | Hachage BCrypt, 8 caractères minimum, jamais renvoyés par l'API | user-service |
| Authentification | Jeton JWT signé (HS256), valable 15 minutes, rôle `USER` ou `ADMIN` | user-service |
| Autorisation | Seul le catalogue est public ; le propriétaire d'une annonce vient du jeton, jamais du formulaire ; routes `/api/admin` réservées au rôle `ADMIN` | collection-service |
| Compte administrateur | Créé au démarrage depuis des variables d'environnement, sans mot de passe par défaut ; l'inscription publique ne donne jamais ce rôle | user-service |
| Erreurs | Codes HTTP exacts (401, 403, 404, 409), sans détail interne | les deux services |
| Données saisies | Validation côté serveur (prix, longueurs, formats) ; requêtes SQL paramétrées | DTO, repository |
| Contournement de la plateforme | Modération automatique : e-mail, téléphone et termes interdits refusés, prix très élevé en validation manuelle | collection-service |
| Photos | Format reconnu par le contenu du fichier (JPEG, PNG, WebP) et non par son nom ; 1 Mo au maximum (413 sinon) ; photo d'une annonce non approuvée visible seulement de son propriétaire et des administrateurs ; photo supprimée avec l'annonce | collection-service |
| Interface | Identifiants validés (UUID) avant de construire une adresse d'API ; aucun `innerHTML` ; fenêtres natives `<dialog>` | frontend |
| Secrets | `.env` hors du dépôt, `.env.example` sans valeur réelle, `SONAR_TOKEN` en secret GitHub | dépôt |
| Conteneurs | Les trois images s'exécutent avec un utilisateur sans privilèges | Dockerfiles |

## 3. Détection automatique

| Outil | Ce qu'il cherche | Quand | Effet |
|---|---|---|---|
| Trivy | Failles des dépendances (avec correctif disponible), secrets oubliés, erreurs de configuration (Docker), de gravité haute ou critique | à chaque push | **fait échouer la CI** |
| SonarCloud | Bugs, vulnérabilités, doublons, couverture | à chaque push sur `main` | Quality Gate : couverture ≥ 80 % du code nouveau, notes A |
| Dependabot | Dépendances obsolètes ou vulnérables | chaque semaine | pull requests triées à la main |
| Tests automatiques | Régressions, contrôle d'accès (401, 403) | à chaque push | font échouer la CI |

## 4. Amélioration continue : des exemples réels

Le cycle est toujours le même : **détecter, analyser, corriger, vérifier, documenter**. Voici ce qu'il a produit dans ce projet.

| Détecté par | Constat | Correction |
|---|---|---|
| Trivy | Règle DS-0002 : les trois Dockerfiles s'exécutaient en root | Création d'un utilisateur dédié (`USER app`, `USER node`), puis Trivy rendu bloquant |
| SonarCloud | Alertes « Client-Side Request Forgery » : identifiants utilisateur collés dans des adresses d'API | Module `api.ts` : identifiants validés par expression régulière d'UUID et encodés |
| SonarCloud | Expression régulière à coût super-linéaire dans la modération (risque de blocage sur un texte hostile) | E-mail borné, téléphone détecté par un parcours linéaire, test sur une entrée d'un million de caractères |
| SonarCloud | Fenêtres cliquables sans équivalent clavier (accessibilité) | Composant `Modal` : balise `<dialog>`, bouton de fermeture, touche Échap |
| Essai manuel | Les erreurs d'authentification (409, 400) arrivaient en 401 vide, route `/error` interdite | Route autorisée, tests ajoutés |
| Dependabot | Mises à jour vers Java 24 et 25 (hors support long) et vers une version majeure de TypeScript | Refusées et exclues dans `dependabot.yml` ; seules les mises à jour sûres ont été fusionnées |
| Dependabot | Analyse Sonar en échec sur les pull requests, faute d'accès au secret | Étape Sonar ignorée pour Dependabot, qui n'a pas accès aux secrets |

## 5. Analyse des risques

Gravité = impact si le risque se réalise. Probabilité estimée pour un site de cette taille.

| Risque | Gravité | Probabilité | Mesure en place | Reste à faire |
|---|---|---|---|---|
| Vol de compte par mot de passe faible ou deviné | haute | moyenne | BCrypt, longueur minimale | limiter les tentatives de connexion |
| Jeton volé ou falsifié | haute | faible | signature HS256, durée de 15 minutes | rotation de la clé, jeton de renouvellement |
| Lecture ou modification des annonces d'un autre | haute | faible | contrôle du propriétaire côté serveur, tests 401 et 403 | — |
| Élévation de privilèges (devenir administrateur) | haute | faible | rôle porté par le jeton signé, aucune route publique pour le changer | journal des actions d'administration |
| Échange de coordonnées hors plateforme | moyenne | haute | modération automatique | analyse des messages du futur chat |
| Dépendance vulnérable | haute | moyenne | Dependabot, Trivy bloquant | — |
| Secret publié dans le dépôt | haute | faible | `.env` ignoré, analyse de secrets par Trivy | rotation régulière des secrets |
| Conteneur compromis | haute | faible | utilisateur sans privilèges | analyse des images construites |
| Fraude (prix aberrant, vendeur suspect) | moyenne | moyenne | prix > 5 000 € en validation manuelle | composant antifraude dédié alimenté par les changements de prix |
| Déni de service | moyenne | moyenne | — | limitation de débit |
| Interception du trafic | haute | faible en local | — | HTTPS dès la mise en ligne |

## 6. Gestion des incidents (procédure cible)

Cette procédure est décrite mais n'a pas encore été exercée.

1. **Détecter** : alerte de la CI, de SonarCloud, de Dependabot, ou signalement d'un utilisateur.
2. **Contenir** : couper l'accès concerné (suspendre le compte, retirer l'annonce par le back-office, arrêter le service).
3. **Analyser** : lire les journaux Docker, retrouver le commit ou la configuration en cause.
4. **Corriger** : correctif sur une branche, tests, revue, fusion.
5. **Rétablir** : redéployer, vérifier.
6. **Documenter et améliorer** : ajouter une ligne au tableau de la partie 4 et un test qui empêche le retour.

Cas particulier : **fuite d'un secret**. Changer immédiatement la valeur (`JWT_SECRET` invalide tous les jetons en circulation, `SONAR_TOKEN` se régénère dans SonarCloud), puis vérifier qu'elle n'apparaît plus dans l'historique du dépôt.

## 7. Supervision

| Élément | État |
|---|---|
| Santé des services (`/actuator/health`) | en place |
| Journaux des conteneurs (`docker compose logs`) | en place |
| Résultats de la CI à chaque push | en place |
| Métriques et tableaux de bord (Prometheus, Grafana) | à faire |
| Alertes automatiques | à faire |

## 8. Prochaines étapes de sécurité

1. Supervision : métriques et tableau de bord.
2. Analyse des images Docker construites, en plus du dépôt.
3. Limitation de débit sur la connexion et sur l'API.
4. Journal des actions d'administration.
5. HTTPS et en-têtes de sécurité dès qu'un déploiement existe.
