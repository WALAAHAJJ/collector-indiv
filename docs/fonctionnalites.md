# Fonctionnalités

Ce document détaille ce que fait le site, fonctionnalité par fonctionnalité. Le [README](../README.md) en donne la vue d'ensemble.

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
| Paiement par carte de test traité par un service dédié (payment-service) : achat d'une annonce, commission de 5 %, annonce marquée vendue, commandes enregistrées (API et tests) | Fait |
| Paiement : bouton « Acheter », fenêtre de paiement avec le détail du prix, « Mes commandes » (achats, ventes avec commission et gain net) | Fait |
| Paiement : notification au vendeur à chaque vente (événement RabbitMQ `order.paid`, « Vous gagnez 22,00 € ») | Fait |
| Suivi de commande : expédiée par le vendeur, reçue par l'acheteur, avec notification de l'autre partie (`order.shipped`, `order.delivered`) | Fait |
| Données de démonstration : 42 annonces réalistes, sept catégories, six vendeurs fictifs (`DEMO_DATA=true`) | Fait |
| Page de détail d'une annonce avec adresse partageable (`#/annonce/…`), annonces de la même catégorie, bandeau « vendue » | Fait |
| Catalogue enrichi : recherche, tri (prix, nom), filtres par fourchette de prix et par état, pagination de 12 annonces | Fait |
| Favoris : cœur cliquable sur chaque annonce et filtre « Mes favoris » (liste conservée par compte dans le navigateur) | Fait |
| Reçu d'achat en PDF téléchargeable depuis « Mes achats » (généré par le service des annonces, réservé à l'acheteur) | Fait |
| Remboursement par l'administrateur : onglet « Commandes » du back-office, remboursement par le service de paiement, objet remis en vente si la commande n'était pas expédiée | Fait |
| Avis sur les vendeurs : note de 1 à 5 et commentaire après réception, une seule fois par commande, moyenne et derniers avis sur la page de l'annonce, avis reçu visible par le vendeur dans « Mes ventes » | Fait |
| Pages d'un site complet : « Comment ça marche », FAQ, conditions d'utilisation, contact (adresses `#/faq`, `#/cgu`…), liens dans l'en-tête et le pied de page, bandeau en trois étapes sur l'accueil | Fait |
| Chat | À faire |
| Détection de fraude, recommandations, internationalisation | À faire |

Une annonce au prix supérieur à 5 000 € reste en attente de validation manuelle : un administrateur la valide ou la refuse depuis l'écran « Administration » du site.

## Modération automatique

Chaque annonce créée ou modifiée est contrôlée sans intervention humaine :

- adresse e-mail ou numéro de téléphone dans le titre ou la description : **refusée** (les échanges doivent passer par la plateforme) ;
- terme interdit (contrefaçon, drogue, arme, PayPal, virement, Western Union) : **refusée** ;
- prix supérieur à 5 000 € : **en attente** de validation manuelle ;
- sinon : **approuvée** et visible dans le catalogue.

Les motifs de refus sont affichés au vendeur. La détection du téléphone n'utilise pas d'expression régulière, pour éviter les blocages sur des textes hostiles.

## Paiement, catalogue et suivi de commande

Aucun argent ne bouge : le service de paiement utilise des cartes de test, mais il applique les vrais contrôles d'une carte et garde la trace de chaque tentative, refusée comprise.

- **Commission** : 5 % du prix de l'objet (réglable par `app.payment.commission-rate`), arrondie au centime. Le port revient au vendeur. Pour un objet à 20,00 € avec 3,00 € de port : l'acheteur paie 23,00 €, le site garde 1,00 €, le vendeur reçoit 22,00 €.
- **Cartes de test** : `4242 4242 4242 4242` est acceptée ; `4000 0000 0000 0002` est toujours refusée ; un numéro dont la clé de Luhn est fausse ou une date dépassée est refusé.
- **Achat atomique** : l'annonce est verrouillée, payée, marquée vendue et la commande enregistrée dans une seule transaction. Un paiement refusé ne change rien ; si l'achat échoue après le débit, le paiement est remboursé automatiquement ; si le service de paiement est arrêté, l'acheteur reçoit une erreur claire et rien n'est débité. Deux acheteurs simultanés : le second reçoit une erreur 409.
- **Données de carte** : jamais enregistrées ni journalisées ; la commande garde seulement les 4 derniers chiffres.
- **Notification de vente** : une fois l'achat validé, le service des annonces publie `order.paid` sur RabbitMQ ; le vendeur reçoit dans sa cloche « « … » est vendu ! Vous gagnez 22,00 € … expédiez la commande depuis Mes commandes > Mes ventes », et l'acheteur « Votre paiement pour « … » est confirmé ». L'envoi attend la fin de la transaction : un achat annulé ne prévient personne.
- **Notifications de suivi** : quand le vendeur expédie, l'acheteur reçoit « Votre commande « … » a été expédiée… confirmez-le dans Mes commandes > Mes achats » (`order.shipped`) ; quand l'acheteur confirme la réception, le vendeur est prévenu et sait que l'acheteur peut le noter (`order.delivered`). Même principe : envoi après validation de la transaction, et un RabbitMQ arrêté ne bloque pas la commande.
- Une annonce vendue quitte le catalogue et ne peut plus être modifiée, supprimée ni remise en vente.

Catalogue : la recherche et la catégorie sont traitées par l'API (`category`, `search`) ; le tri (pertinence, prix croissant ou décroissant, nom), le filtre de prix minimum et maximum, le filtre d'état et la pagination (12 annonces par page) sont appliqués dans le navigateur, par des fonctions pures testées (`frontend/src/catalogue.ts`). Les favoris sont enregistrés dans le navigateur (`localStorage`), une liste par compte : ils ne suivent pas l'utilisateur d'un appareil à l'autre. Un stockage dans une table de l'API serait l'étape suivante. Choix assumé pour le tri : à l'échelle de quelques centaines d'annonces c'est instantané et sans appel réseau ; au-delà de plusieurs milliers, il faudrait déplacer le tri et la pagination dans l'API (`page`, `size`, `sort`).

Dans le site : « Voir le détail » ouvre la page de l'annonce (adresse `#/annonce/<identifiant>`, copiable). Sur cette page, un visiteur voit « Se connecter pour acheter », le vendeur voit « C'est votre annonce », un autre utilisateur ouvre la fenêtre de paiement. Après l'achat, l'objet disparaît du catalogue, sa page affiche « Cette annonce a été vendue » et la commande apparaît dans « Mes commandes ».

Suivi : dans « Mes commandes », chaque commande affiche son étape (payée, expédiée, reçue). Le vendeur voit « Marquer comme expédiée » sur l'onglet « Mes ventes » ; l'acheteur voit « J'ai reçu mon colis » sur l'onglet « Mes achats » une fois la commande expédiée. Chacun est prévenu par la cloche de notifications. Sur « Mes achats », le bouton « Télécharger le reçu (PDF) » donne le reçu de l'achat. Un administrateur peut rembourser une commande depuis « Administration », onglet « Commandes ».
