package com.collector.payment.card;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.YearMonth;
import java.time.ZoneOffset;

/**
 * Banque factice : aucun argent ne bouge. Elle applique pourtant les vrais contrôles d'une carte,
 * pour que le parcours soit réaliste :
 *
 * <ul>
 *   <li>le numéro doit être valide (clé de Luhn, la somme de contrôle de toutes les cartes) ;</li>
 *   <li>la carte ne doit pas être expirée (valable jusqu'à la fin du mois indiqué) ;</li>
 *   <li>le numéro de test {@value #DECLINED_TEST_CARD} est toujours refusé, pour tester l'échec
 *       (comme les numéros de test des vrais prestataires).</li>
 * </ul>
 *
 * <p>Pour un paiement réussi : 4242 4242 4242 4242.
 * Remplacer cette classe par un appel à Stripe ne change rien pour les autres services.
 */
@Component
public class CardValidator {

    public static final String DECLINED_TEST_CARD = "4000000000000002";

    private final Clock clock;

    public CardValidator(Clock clock) {
        this.clock = clock;
    }

    /** @throws CardDeclinedException si la carte est invalide, expirée ou refusée */
    public void validate(CardDetails card) {
        String digits = card.digits();

        if (!digits.matches("\\d{13,19}") || !passesLuhn(digits)) {
            throw new CardDeclinedException("Numéro de carte invalide.");
        }

        if (isExpired(card.expiry())) {
            throw new CardDeclinedException("Carte expirée.");
        }

        if (DECLINED_TEST_CARD.equals(digits)) {
            throw new CardDeclinedException("Paiement refusé par la banque.");
        }
    }

    /** Clé de Luhn : on double un chiffre sur deux en partant de la droite ; la somme doit être un multiple de 10. */
    static boolean passesLuhn(String digits) {
        int sum = 0;
        boolean doubleIt = false;

        for (int i = digits.length() - 1; i >= 0; i--) {
            int digit = digits.charAt(i) - '0';

            if (doubleIt) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            doubleIt = !doubleIt;
        }

        return sum % 10 == 0;
    }

    /** {@code expiry} vaut « MM/AA » (format déjà contrôlé à la réception de la requête). */
    private boolean isExpired(String expiry) {
        int month = Integer.parseInt(expiry.substring(0, 2));
        int year = 2000 + Integer.parseInt(expiry.substring(3, 5));

        return YearMonth.of(year, month).isBefore(YearMonth.now(clock.withZone(ZoneOffset.UTC)));
    }
}
