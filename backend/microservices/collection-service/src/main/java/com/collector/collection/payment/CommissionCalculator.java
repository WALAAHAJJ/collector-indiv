package com.collector.collection.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Calcule ce que paie l'acheteur et ce que reçoit le vendeur.
 *
 * <p>La commission du site se calcule sur le prix de l'objet, pas sur la livraison :
 * le port revient en entier au vendeur, qui l'expédie.
 *
 * <ul>
 *   <li>commission = prix × taux, arrondie au centime (0,5 centime et plus arrondi au-dessus)</li>
 *   <li>l'acheteur paie : prix + livraison</li>
 *   <li>le vendeur reçoit : prix − commission + livraison</li>
 * </ul>
 *
 * <p>Tout est en {@link BigDecimal} : un {@code double} donnerait des erreurs d'arrondi
 * (0,1 + 0,2 ne fait pas 0,3), inacceptables pour de l'argent.
 */
@Component
public class CommissionCalculator {

    private final BigDecimal rate;

    public CommissionCalculator(@Value("${app.payment.commission-rate:0.05}") BigDecimal rate) {
        if (rate.signum() < 0 || rate.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("Le taux de commission doit être compris entre 0 et 1 : " + rate);
        }
        this.rate = rate;
    }

    public Breakdown compute(BigDecimal price, BigDecimal shippingCost) {
        BigDecimal commission = price.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        return new Breakdown(
                price,
                shippingCost,
                commission,
                price.add(shippingCost),
                price.subtract(commission).add(shippingCost)
        );
    }

    public record Breakdown(
            BigDecimal itemPrice,
            BigDecimal shippingCost,
            BigDecimal commission,
            BigDecimal buyerTotal,
            BigDecimal sellerNet
    ) {
    }
}
