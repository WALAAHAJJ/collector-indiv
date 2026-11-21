package com.collector.collection.receipt;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Générateur de PDF minimal : une page A4, du texte (Helvetica, normal ou gras) et des traits.
 * Il évite une bibliothèque externe pour un document aussi simple qu'un reçu.
 *
 * <p>Le texte est encodé en Windows-1252 (WinAnsi) : les accents français et le signe € s'affichent
 * sans police intégrée. Un caractère hors de ce jeu est remplacé par « ? ».
 */
public final class SimplePdf {

    private static final Charset WIN_ANSI = Charset.forName("windows-1252");

    private final List<String> operations = new ArrayList<>();

    /** Écrit une ligne de texte ; (0, 0) est le coin en bas à gauche, en points (A4 : 595 × 842). */
    public SimplePdf text(int x, int y, int size, boolean bold, String text) {
        operations.add("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x + " " + y + " Td ("
                + escape(text) + ") Tj ET");
        return this;
    }

    /** Trace un trait horizontal. */
    public SimplePdf line(int x1, int x2, int y) {
        operations.add("0.5 w " + x1 + " " + y + " m " + x2 + " " + y + " l S");
        return this;
    }

    public byte[] toBytes() {
        // Le texte est déjà passé en octets Windows-1252 (un octet par caractère) : on le recopie tel quel.
        byte[] content = String.join("\n", operations).getBytes(StandardCharsets.ISO_8859_1);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        List<Integer> offsets = new ArrayList<>();

        write(out, "%PDF-1.4\n");
        object(out, offsets, "<< /Type /Catalog /Pages 2 0 R >>");
        object(out, offsets, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        object(out, offsets, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                + "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>");

        offsets.add(out.size());
        write(out, "4 0 obj\n<< /Length " + content.length + " >>\nstream\n");
        out.writeBytes(content);
        write(out, "\nendstream\nendobj\n");

        object(out, offsets, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        object(out, offsets, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

        int xref = out.size();
        write(out, "xref\n0 " + (offsets.size() + 1) + "\n0000000000 65535 f \n");
        for (int offset : offsets) {
            write(out, String.format("%010d 00000 n \n", offset));
        }
        write(out, "trailer\n<< /Size " + (offsets.size() + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");

        return out.toByteArray();
    }

    /** Ajoute un objet numéroté dans l'ordre (1, 2, 3, …) en notant sa position pour la table des références. */
    private static void object(ByteArrayOutputStream out, List<Integer> offsets, String body) {
        offsets.add(out.size());
        // Le numéro suit l'ordre d'ajout ; l'objet 4 (le contenu) est écrit à part dans toBytes().
        int number = offsets.size();
        write(out, number + " 0 obj\n" + body + "\nendobj\n");
    }

    private static void write(ByteArrayOutputStream out, String text) {
        out.writeBytes(text.getBytes(StandardCharsets.ISO_8859_1));
    }

    private static String escape(String text) {
        // Les caractères propres à PDF sont protégés ; le reste est encodé en Windows-1252 puis relu en Latin-1
        // pour que chaque octet reste un seul caractère dans le flux.
        String safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
                .replace("\r", " ").replace("\n", " ");
        return new String(safe.getBytes(WIN_ANSI), StandardCharsets.ISO_8859_1);
    }
}
