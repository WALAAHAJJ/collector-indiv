package com.collector.collection.service;

import com.collector.collection.domain.ListingStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.regex.Pattern;

@Service
public class ModerationService {

    static final BigDecimal MANUAL_REVIEW_PRICE = new BigDecimal("5000");

    private static final int PHONE_MIN_DIGITS = 9;

    private static final Pattern EMAIL = Pattern.compile(
            "[A-Za-z0-9._%+-]{1,64}+@(?:[A-Za-z0-9-]{1,63}+\\.){1,8}+[A-Za-z]{2,24}+");

    private static final Pattern FORBIDDEN_WORDS = Pattern.compile(
            "\\b(contrefaçon|contrefacon|drogue|arme|paypal|virement|western union)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
                    | Pattern.UNICODE_CHARACTER_CLASS | Pattern.CANON_EQ);

    public ModerationResult evaluate(String name, String description, BigDecimal price) {
        String text = name + " " + (description == null ? "" : description);

        if (EMAIL.matcher(text).find() || containsPhoneNumber(text)) {
            return new ModerationResult(
                    ListingStatus.REJECTED,
                    "Les coordonnées personnelles sont interdites : les échanges passent par la plateforme."
            );
        }

        if (FORBIDDEN_WORDS.matcher(text).find()) {
            return new ModerationResult(
                    ListingStatus.REJECTED,
                    "L’annonce contient un terme interdit par la charte."
            );
        }

        if (price != null && price.compareTo(MANUAL_REVIEW_PRICE) > 0) {
            return new ModerationResult(
                    ListingStatus.PENDING_REVIEW,
                    "Prix élevé : vérification complémentaire requise."
            );
        }

        return new ModerationResult(ListingStatus.APPROVED, null);
    }

    /**
     * Détecte une suite d'au moins {@value #PHONE_MIN_DIGITS} chiffres, séparés au plus
     * par un espace, un point, un tiret ou un plus. Parcours linéaire, sans expression régulière.
     */
    static boolean containsPhoneNumber(String text) {
        int digits = 0;
        boolean separatorPending = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);

            if (c >= '0' && c <= '9') {
                digits++;
                separatorPending = false;

                if (digits >= PHONE_MIN_DIGITS) {
                    return true;
                }
            } else if (digits > 0 && !separatorPending && isPhoneSeparator(c)) {
                separatorPending = true;
            } else {
                digits = 0;
                separatorPending = false;
            }
        }

        return false;
    }

    private static boolean isPhoneSeparator(char c) {
        return c == ' ' || c == '.' || c == '-' || c == '+';
    }
}
