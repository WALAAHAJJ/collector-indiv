package com.collector.collection.receipt;

import com.collector.collection.domain.OrderStatus;
import com.collector.collection.domain.PurchaseOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Reçu d'achat remis à l'acheteur : ce qu'il a acheté, ce qu'il a payé, avec quelle carte. */
public final class ReceiptPdf {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int LEFT = 60;
    private static final int VALUE = 250;
    private static final int RIGHT = 535;

    private ReceiptPdf() {
    }

    public static String fileName(PurchaseOrder order) {
        return "recu-" + order.getId().toString().substring(0, 8) + ".pdf";
    }

    public static byte[] render(PurchaseOrder order) {
        SimplePdf pdf = new SimplePdf();

        pdf.text(LEFT, 780, 24, true, "Collector");
        pdf.text(LEFT, 756, 13, false, "Reçu d'achat");
        pdf.line(LEFT, RIGHT, 740);

        int y = 710;
        y = row(pdf, y, "Numéro de commande", order.getId().toString(), false);
        y = row(pdf, y, "Date", DATE.format(order.getCreatedAt().atZone(PARIS)), false);
        y = row(pdf, y, "Objet", shorten(order.getListingName(), 55), false);
        y = row(pdf, y, "Prix de l'objet", euros(order.getItemPrice()), false);
        y = row(pdf, y, "Frais d'expédition", euros(order.getShippingCost()), false);
        pdf.line(LEFT, RIGHT, y + 12);
        y = row(pdf, y - 10, "Total payé", euros(order.getBuyerTotal()), true);
        y = row(pdf, y, "Carte bancaire", "•••• •••• •••• " + order.getCardLast4(), false);

        if (order.getPaymentId() != null) {
            y = row(pdf, y, "Référence du paiement", order.getPaymentId(), false);
        }

        if (order.getStatus() == OrderStatus.REFUNDED && order.getRefundedAt() != null) {
            y = row(pdf, y, "Remboursement", "Remboursée le " + DATE.format(order.getRefundedAt().atZone(PARIS)), true);
        }

        pdf.line(LEFT, RIGHT, 80);
        pdf.text(LEFT, 62, 9, false, "Document généré automatiquement par Collector, place de marché entre collectionneurs.");

        return pdf.toBytes();
    }

    private static int row(SimplePdf pdf, int y, String label, String value, boolean bold) {
        pdf.text(LEFT, y, 11, false, label);
        pdf.text(VALUE, y, 11, bold, value);
        return y - 26;
    }

    private static String euros(BigDecimal value) {
        return value.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString().replace('.', ',') + " €";
    }

    private static String shorten(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }

    /** Pour les tests : la date telle qu'elle est écrite sur le reçu. */
    static String formatDate(Instant instant) {
        return DATE.format(instant.atZone(PARIS));
    }
}
