package com.collector.collection.payment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.YearMonth;
import java.time.ZoneOffset;

/**
 * Prestataire de paiement factice : aucun argent ne bouge. Il applique pourtant les vrais
 * contrôles d'une carte, pour que le parcours soit réaliste :
 *
 * <ul>
 *   <li>le numéro doit être valide (clé de Luhn, la somme de contrôle de toutes les cartes) ;</li>
 *   <li>la carte ne doit pas être expirée (valable jusqu'à la fin du mois indiqué) ;</li>
 *   <li>le numéro de test {@value #DECLINED_TEST_CARD} est toujours refusé, pour tester l'échec
 *       (comme les numéros de test des vrais prestataires).</li>
 * </ul>
 *
 * <p>Pour un paiement réussi : 4242 4242 4242 4242.
 */
@Component
public class SimulatedPaymentGateway implements PaymentGateway {

    public static final String DECLINED_TEST_CARD = "4000000000000002";

    private final Clock clock;

    public SimulatedPaymentGateway(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void charge(CardDetails card, BigDecimal amount) {
        String digits = card.digits();

        if (!digits.matches("\\d{13,19}") || !passesLuhn(digits)) {
            throw new PaymentDeclinedException("Numéro de carte invalide.");
        }

        if (isExpired(card.expiry())) {
            throw new PaymentDeclinedException("Carte expirée.");
        }

        if (DECLINED_TEST_CARD.equals(digits)) {
            throw new PaymentDeclinedException("Paiement refusé par la banque.");
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
