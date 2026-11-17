package com.collector.collection.config;

import com.collector.collection.domain.ItemCondition;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Annonces de démonstration : une quarantaine d'objets réalistes, de six vendeurs fictifs, répartis dans
 * sept catégories. Les prix et les descriptions sont inventés pour la démonstration.
 *
 * <p>Les identifiants des vendeurs sont fixes : le site sait ainsi que la démonstration est déjà chargée
 * et ne la recharge pas à chaque démarrage.
 */
final class DemoCatalog {

    static final List<UUID> SELLERS = List.of(
            UUID.fromString("d0000000-0000-4000-8000-000000000001"),
            UUID.fromString("d0000000-0000-4000-8000-000000000002"),
            UUID.fromString("d0000000-0000-4000-8000-000000000003"),
            UUID.fromString("d0000000-0000-4000-8000-000000000004"),
            UUID.fromString("d0000000-0000-4000-8000-000000000005"),
            UUID.fromString("d0000000-0000-4000-8000-000000000006")
    );

    /** Catégories ajoutées par la démonstration, en plus des quatre catégories de départ. */
    static final List<String> EXTRA_CATEGORIES = List.of("Vinyles", "Figurines", "Livres anciens");

    record Item(
            String name,
            String category,
            String description,
            String price,
            String shippingCost,
            ItemCondition condition,
            int seller
    ) {

        BigDecimal priceValue() {
            return new BigDecimal(price);
        }

        BigDecimal shippingValue() {
            return new BigDecimal(shippingCost);
        }

        UUID sellerId() {
            return SELLERS.get(seller);
        }
    }

    static final List<Item> ITEMS = List.of(
            new Item("Carte postale Paris, Tour Eiffel, 1905", "Cartes postales",
                    "Carte postale ancienne en noir et blanc, voyagée en 1905. Légère trace de pliure dans un coin, texte manuscrit lisible, timbre d'époque oblitéré.",
                    "12.00", "1.50", ItemCondition.GOOD, 0),
            new Item("Lot de 10 cartes postales de Bretagne", "Cartes postales",
                    "Dix cartes postales des années 1950 : ports, calvaires et costumes bretons. Toutes écrites, bon état général.",
                    "18.50", "2.50", ItemCondition.GOOD, 1),
            new Item("Carte postale Nice, Promenade des Anglais", "Cartes postales",
                    "Carte colorisée des années 1930, vue sur la baie. Verso neuf, jamais écrit, coins francs.",
                    "9.00", "1.20", ItemCondition.VERY_GOOD, 2),
            new Item("Carte postale fantaisie, Bonne Année 1912", "Cartes postales",
                    "Carte gaufrée avec trèfles et fer à cheval, dorure encore brillante. Petit manque de papier au dos.",
                    "6.50", "1.20", ItemCondition.USED, 3),
            new Item("Série de 6 cartes postales Art nouveau", "Cartes postales",
                    "Six cartes illustrées dans le style Art nouveau, éditions d'époque. Couleurs vives, sans pli.",
                    "34.00", "2.50", ItemCondition.VERY_GOOD, 4),
            new Item("Carte postale Lyon, place Bellecour, 1920", "Cartes postales",
                    "Animation de rue avec tramway. Carte voyagée, timbre 25 centimes, écriture à l'encre violette.",
                    "8.00", "1.20", ItemCondition.GOOD, 5),
            new Item("Carte postale Strasbourg, la cathédrale", "Cartes postales",
                    "Vue de la cathédrale et de la place Kléber, éditions anciennes. Bon état, un angle légèrement arrondi.",
                    "7.50", "1.20", ItemCondition.GOOD, 0),
            new Item("Album de 120 cartes postales anciennes", "Cartes postales",
                    "Album d'époque rempli de cartes de toute la France, classées par région. Reliure fatiguée, cartes bien conservées.",
                    "95.00", "6.90", ItemCondition.GOOD, 1),
            new Item("Pièce de 5 francs Semeuse, 1960", "Pièces",
                    "Pièce en argent, tranche cannelée, patine régulière. Sans choc visible, livrée sous capsule.",
                    "14.00", "1.80", ItemCondition.VERY_GOOD, 2),
            new Item("Pièce de 2 francs Semeuse, 1914", "Pièces",
                    "Belle pièce en argent de la Première Guerre mondiale. Usure normale, légende lisible.",
                    "11.50", "1.80", ItemCondition.GOOD, 3),
            new Item("Lot de 20 pièces de 1 franc, 1960 à 1990", "Pièces",
                    "Vingt pièces de 1 franc, millésimes variés, bien conservées. Idéal pour débuter une collection.",
                    "16.00", "2.20", ItemCondition.USED, 4),
            new Item("Pièce commémorative 10 euros Hercule, 2012", "Pièces",
                    "Pièce en argent de la Monnaie de Paris, livrée dans son écrin d'origine avec certificat.",
                    "38.00", "3.50", ItemCondition.NEW, 5),
            new Item("Pièce de 100 francs Panthéon, 1986", "Pièces",
                    "Pièce en argent, bien centrée, brillante, dans une capsule transparente.",
                    "24.00", "2.20", ItemCondition.VERY_GOOD, 0),
            new Item("Lot de pièces d'Europe avant l'euro", "Pièces",
                    "Une trentaine de pièces de huit pays, de l'Espagne à l'Allemagne, des années 1970 à 2001.",
                    "22.00", "2.80", ItemCondition.USED, 1),
            new Item("Pièce de 50 centimes Napoléon III, 1865", "Pièces",
                    "Pièce en bronze de l'Empire, relief net, légère patine brune. Frappe A (Paris).",
                    "27.50", "2.00", ItemCondition.GOOD, 2),
            new Item("Coffret Belle Épreuve 2010 France", "Pièces",
                    "Série complète de pièces de collection en qualité Belle Épreuve, écrin de la Monnaie de Paris, jamais ouvert.",
                    "79.00", "5.50", ItemCondition.NEW, 3),
            new Item("Timbre France Marianne de Cheffer, 1967", "Timbres",
                    "Série de timbres neufs sans charnière, gomme intacte, dentelure parfaite.",
                    "8.00", "1.20", ItemCondition.NEW, 4),
            new Item("Feuille de timbres Europa 1960", "Timbres",
                    "Feuille complète de timbres neufs, couleurs éclatantes, pliure unique en marge.",
                    "29.00", "2.20", ItemCondition.VERY_GOOD, 5),
            new Item("Lot de 200 timbres oblitérés du monde", "Timbres",
                    "Deux cents timbres de plus de trente pays, triés par thème (animaux, sport, art).",
                    "10.00", "2.20", ItemCondition.USED, 0),
            new Item("Carnet de timbres Croix-Rouge, 1975", "Timbres",
                    "Carnet complet jamais utilisé, gomme d'origine, couverture légèrement jaunie.",
                    "13.50", "1.50", ItemCondition.VERY_GOOD, 1),
            new Item("Série Jeux olympiques de Grenoble, 1968", "Timbres",
                    "Série neuve avec charnière, très bon centrage, dans une pochette de protection.",
                    "15.00", "1.50", ItemCondition.VERY_GOOD, 2),
            new Item("Bloc-feuillet Pêche et Poissons, 1999", "Timbres",
                    "Bloc neuf, jamais plié, avec pochette transparente. Illustrations nettes.",
                    "17.50", "1.50", ItemCondition.NEW, 3),
            new Item("Enveloppe premier jour Concorde, 1969", "Timbres",
                    "Enveloppe avec cachet du premier jour, timbre à l'effigie de l'avion. Fraîche, sans tache.",
                    "12.50", "1.20", ItemCondition.VERY_GOOD, 4),
            new Item("Album de timbres de collection, 1000 pièces", "Timbres",
                    "Album à pages en tissu avec environ 1000 timbres oblitérés, France et colonies. Reliure solide.",
                    "65.00", "6.50", ItemCondition.GOOD, 5),
            new Item("Lampe à pétrole en laiton, début XXe", "Autres objets",
                    "Lampe à pétrole en laiton patiné avec son verre d'origine. Fonctionne, mèche récente.",
                    "48.00", "8.90", ItemCondition.GOOD, 0),
            new Item("Réveil mécanique Jaz, années 1960", "Autres objets",
                    "Réveil à remontage manuel, cadran en bon état, sonnerie fonctionnelle. Boîtier avec petites rayures.",
                    "26.00", "4.50", ItemCondition.GOOD, 1),
            new Item("Appareil photo Kodak Brownie, 1950", "Autres objets",
                    "Appareil à soufflet, mécanisme libre, fourni avec sa housse en cuir d'origine.",
                    "42.00", "6.90", ItemCondition.USED, 2),
            new Item("Presse-papiers en verre millefiori", "Autres objets",
                    "Pièce de verrerie soufflée à la main, sans bulle ni éclat, avec socle en bois.",
                    "35.00", "5.90", ItemCondition.VERY_GOOD, 3),
            new Item("Médaille de la Foire de Paris, 1937", "Autres objets",
                    "Médaille en bronze avec ruban d'origine, dans son étui. Patine régulière.",
                    "21.00", "2.50", ItemCondition.GOOD, 4),
            new Item("Boîte à musique en bois, années 1970", "Autres objets",
                    "Boîte à musique à manivelle jouant une valse, mécanisme en état de marche, bois verni.",
                    "30.00", "6.50", ItemCondition.GOOD, 5),
            new Item("Vinyle Les Beatles, Abbey Road, pressage 1969", "Vinyles",
                    "Disque 33 tours, pochette d'origine avec légère usure d'angles, disque brillant sans rayure profonde.",
                    "85.00", "6.90", ItemCondition.GOOD, 0),
            new Item("Vinyle Serge Gainsbourg, Histoire de Melody Nelson", "Vinyles",
                    "Édition française des années 1970, pochette ouvrante, très peu écouté, sans craquement.",
                    "75.00", "6.90", ItemCondition.VERY_GOOD, 1),
            new Item("Lot de 10 disques 45 tours des années 1960", "Vinyles",
                    "Dix disques 45 tours en pochettes d'époque : chanson française et yéyé. Rayures légères.",
                    "32.00", "5.50", ItemCondition.USED, 2),
            new Item("Vinyle Pink Floyd, Dark Side of the Moon", "Vinyles",
                    "Pressage de collection avec posters et autocollants d'origine, jamais ouvert.",
                    "58.00", "6.90", ItemCondition.NEW, 3),
            new Item("Figurine de collection Tintin et Milou", "Figurines",
                    "Figurine en résine peinte à la main, fabriquée en édition limitée, avec boîte et certificat.",
                    "46.00", "7.50", ItemCondition.NEW, 4),
            new Item("Petits soldats de plomb, 12 pièces", "Figurines",
                    "Douze soldats de plomb peints, uniformes du Premier Empire, légères usures de peinture.",
                    "39.00", "5.90", ItemCondition.USED, 5),
            new Item("Figurine Dinky Toys, Citroën DS, 1960", "Figurines",
                    "Voiture miniature en métal avec ses roues d'origine, peinture d'époque conservée, sans boîte.",
                    "28.00", "4.50", ItemCondition.GOOD, 0),
            new Item("Poupée de collection Bleuette, réédition", "Figurines",
                    "Réédition de la célèbre poupée, vêtements en tissu, livrée dans son carton de présentation.",
                    "52.00", "7.90", ItemCondition.VERY_GOOD, 1),
            new Item("Les Fables de La Fontaine, édition illustrée 1920", "Livres anciens",
                    "Reliure demi-cuir, gravures en couleurs, dos restauré. Rousseurs légères sur les premières pages.",
                    "68.00", "6.50", ItemCondition.GOOD, 2),
            new Item("Atlas Vidal-Lablache, édition de 1930", "Livres anciens",
                    "Atlas historique et géographique, cartes en couleurs dépliantes, reliure cartonnée en bon état.",
                    "55.00", "7.50", ItemCondition.GOOD, 3),
            new Item("Almanach des postes et télégraphes, 1895", "Livres anciens",
                    "Almanach annuel avec cartes de France et tarifs postaux de l'époque. Couverture usée, intérieur propre.",
                    "24.00", "4.50", ItemCondition.USED, 4),
            new Item("Collection complète de pièces d'or du XIXe siècle", "Pièces",
                    "Ensemble de pièces d'or françaises du XIXe siècle, avec certificat d'authenticité et écrin d'expertise. Vente soumise à vérification.",
                    "5400.00", "25.00", ItemCondition.VERY_GOOD, 5)
    );

    private DemoCatalog() {
    }
}
