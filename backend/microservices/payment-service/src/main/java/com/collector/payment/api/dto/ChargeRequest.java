package com.collector.payment.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Demande de paiement. Le format est contrôlé ici, la validité de la carte par la banque simulée. */
public record ChargeRequest(
        @NotNull @DecimalMin(value = "0.01", message = "Le montant doit être positif")
        @DecimalMax(value = "100000.00", message = "Montant trop élevé")
        @Digits(integer = 6, fraction = 2, message = "Montant invalide") BigDecimal amount,
        @NotBlank @Pattern(regexp = "[0-9 -]{13,23}", message = "Numéro de carte invalide") String cardNumber,
        @NotBlank @Size(max = 60) String cardHolder,
        @NotBlank @Pattern(regexp = "(0[1-9]|1[0-2])/[0-9]{2}", message = "Date attendue au format MM/AA") String expiry,
        @NotBlank @Pattern(regexp = "[0-9]{3,4}", message = "Code de sécurité invalide") String cvc
) {

    /** Évite d'imprimer le numéro de carte si la requête finit dans un journal. */
    @Override
    public String toString() {
        return "ChargeRequest[amount=" + amount + ", carte masquée]";
    }
}
