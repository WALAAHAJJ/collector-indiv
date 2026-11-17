package com.collector.collection.payment;

/**
 * Coordonnées de carte reçues pour un paiement. Elles ne sont jamais enregistrées ni journalisées :
 * seuls les quatre derniers chiffres survivent, dans la commande.
 *
 * <p>{@code toString} est redéfini : un record affiche tous ses champs, et une trace d'erreur
 * ne doit jamais contenir un numéro de carte.
 */
public record CardDetails(String number, String holder, String expiry, String cvc) {

    public String digits() {
        return number.replaceAll("[ -]", "");
    }

    public String last4() {
        String digits = digits();
        return digits.substring(digits.length() - 4);
    }

    @Override
    public String toString() {
        return "CardDetails[****" + last4() + "]";
    }
}
