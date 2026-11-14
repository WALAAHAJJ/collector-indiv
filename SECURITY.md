# Politique de signalement des vulnérabilités

Collector est un projet pédagogique. Seule la dernière version de la branche `main` est maintenue : une faille corrigée l'est sur cette branche, sans correctif rétroactif.

## Signaler une faille

Merci de **ne pas ouvrir de ticket public** pour une vulnérabilité : il serait lisible par tout le monde avant d'être corrigé.

Utilise plutôt le signalement privé de GitHub : onglet **Security** du dépôt, puis **Report a vulnerability**. Décris :

- ce que tu as observé et où (route de l'API, écran, composant) ;
- les étapes pour le reproduire ;
- l'impact que tu imagines (lecture de données, droits obtenus, indisponibilité) ;
- la version concernée (le commit, si tu le connais).

L'auteure s'efforce d'accuser réception sous sept jours et de corriger les failles confirmées selon leur gravité. Un test qui empêche le retour de la faille accompagne chaque correction.

## Ce qui est surveillé

Les dépendances, les secrets, la configuration des conteneurs et la qualité du code sont analysés à chaque push (Trivy, SonarCloud, Dependabot). La démarche complète, les risques identifiés et la procédure en cas d'incident sont décrits dans [docs/securite.md](docs/securite.md).
