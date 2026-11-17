package com.collector.collection.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Achat d'une annonce avec une carte (simulée). Le format est contrôlé ici, la validité par la passerelle. */
public record PurchaseRequest(
        @NotNull UUID listingId,
        @NotBlank @Pattern(regexp = "[0-9 -]{13,23}", message = "Numéro de carte invalide") String cardNumber,
        @NotBlank @Size(max = 60) String cardHolder,
        @NotBlank @Pattern(regexp = "(0[1-9]|1[0-2])/[0-9]{2}", message = "Date attendue au format MM/AA") String expiry,
        @NotBlank @Pattern(regexp = "[0-9]{3,4}", message = "Code de sécurité invalide") String cvc
) {

    /** Évite d'imprimer le numéro de carte si la requête finit dans un journal. */
    @Override
    public String toString() {
        return "PurchaseRequest[listingId=" + listingId + ", carte masquée]";
    }
}
