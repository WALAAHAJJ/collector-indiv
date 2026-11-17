package com.collector.collection.payment;

import com.collector.collection.payment.CommissionCalculator.Breakdown;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CommissionCalculatorTests {

    private final CommissionCalculator calculator = new CommissionCalculator(new BigDecimal("0.05"));

    @Test
    void takesFivePercentOfTheItemPrice() {
        Breakdown breakdown = calculator.compute(new BigDecimal("20.00"), new BigDecimal("3.00"));

        assertEquals(new BigDecimal("1.00"), breakdown.commission());
    }

    @Test
    void buyerPaysPricePlusShipping() {
        Breakdown breakdown = calculator.compute(new BigDecimal("20.00"), new BigDecimal("3.00"));

        assertEquals(new BigDecimal("23.00"), breakdown.buyerTotal());
    }

    @Test
    void sellerKeepsThePriceMinusCommissionAndReceivesTheShipping() {
        Breakdown breakdown = calculator.compute(new BigDecimal("20.00"), new BigDecimal("3.00"));

        assertEquals(new BigDecimal("22.00"), breakdown.sellerNet());
    }

    @Test
    void commissionIsNotChargedOnShipping() {
        Breakdown cheapShipping = calculator.compute(new BigDecimal("100.00"), new BigDecimal("0.00"));
        Breakdown dearShipping = calculator.compute(new BigDecimal("100.00"), new BigDecimal("50.00"));

        assertEquals(cheapShipping.commission(), dearShipping.commission());
    }

    @Test
    void roundsToTheCentWithHalfUp() {
        // 19,99 × 0,05 = 0,9995 → 1,00
        assertEquals(new BigDecimal("1.00"),
                calculator.compute(new BigDecimal("19.99"), BigDecimal.ZERO).commission());
        // 0,10 × 0,05 = 0,005 → 0,01 (la moitié s'arrondit vers le haut)
        assertEquals(new BigDecimal("0.01"),
                calculator.compute(new BigDecimal("0.10"), BigDecimal.ZERO).commission());
        // 0,09 × 0,05 = 0,0045 → 0,00
        assertEquals(new BigDecimal("0.00"),
                calculator.compute(new BigDecimal("0.09"), BigDecimal.ZERO).commission());
    }

    @Test
    void sellerNetPlusCommissionMinusShippingIsAlwaysThePrice() {
        for (String price : new String[] {"0.01", "7.77", "19.99", "123.45", "99999.99"}) {
            BigDecimal itemPrice = new BigDecimal(price);
            Breakdown breakdown = calculator.compute(itemPrice, new BigDecimal("4.90"));

            assertEquals(itemPrice,
                    breakdown.sellerNet().add(breakdown.commission()).subtract(breakdown.shippingCost()));
        }
    }

    @Test
    void usesTheConfiguredRate() {
        CommissionCalculator tenPercent = new CommissionCalculator(new BigDecimal("0.10"));

        assertEquals(new BigDecimal("2.00"),
                tenPercent.compute(new BigDecimal("20.00"), BigDecimal.ZERO).commission());
    }

    @Test
    void rejectsARateOutsideZeroToOne() {
        assertThrows(IllegalArgumentException.class, () -> new CommissionCalculator(new BigDecimal("-0.01")));
        assertThrows(IllegalArgumentException.class, () -> new CommissionCalculator(new BigDecimal("1.01")));
    }
}
