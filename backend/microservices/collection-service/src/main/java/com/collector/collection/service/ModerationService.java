package com.collector.collection.service;

import com.collector.collection.domain.ListingStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.regex.Pattern;

@Service
public class ModerationService {

    static final BigDecimal MANUAL_REVIEW_PRICE = new BigDecimal("5000");

    private static final Pattern EMAIL =
            Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");

    private static final Pattern PHONE =
            Pattern.compile("(?:\\+?\\d[\\s.-]?){9,}");

    private static final Pattern FORBIDDEN_WORDS = Pattern.compile(
            "\\b(contrefaçon|contrefacon|drogue|arme|paypal|virement|western union)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS);

    public ModerationResult evaluate(String name, String description, BigDecimal price) {
        String text = name + " " + (description == null ? "" : description);

        if (EMAIL.matcher(text).find() || PHONE.matcher(text).find()) {
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
}
