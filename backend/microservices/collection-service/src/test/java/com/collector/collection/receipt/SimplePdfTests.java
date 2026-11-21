package com.collector.collection.receipt;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SimplePdfTests {

    @Test
    void producesAWellFormedPdf() {
        String pdf = new String(new SimplePdf().text(60, 700, 11, false, "Bonjour").toBytes(), StandardCharsets.ISO_8859_1);

        assertTrue(pdf.startsWith("%PDF-1.4"));
        assertTrue(pdf.contains("(Bonjour) Tj"));
        assertTrue(pdf.trim().endsWith("%%EOF"));
    }

    @Test
    void xrefOffsetsPointToTheirObjects() {
        byte[] bytes = new SimplePdf().text(60, 700, 11, true, "Reçu").toBytes();
        String pdf = new String(bytes, StandardCharsets.ISO_8859_1);

        // Chaque entrée « nnnnnnnnnn 00000 n » doit désigner le début de « N 0 obj ».
        String[] lines = pdf.substring(pdf.indexOf("xref")).split("\n");
        for (int objectNumber = 1; objectNumber <= 6; objectNumber++) {
            int offset = Integer.parseInt(lines[2 + objectNumber].substring(0, 10));
            assertTrue(pdf.startsWith(objectNumber + " 0 obj", offset), "objet " + objectNumber);
        }
    }

    @Test
    void escapesParenthesesAndKeepsAccentsAndEuroInWinAnsi() {
        byte[] bytes = new SimplePdf().text(60, 700, 11, false, "(é) 5 €").toBytes();
        String pdf = new String(bytes, StandardCharsets.ISO_8859_1);

        // é = 0xE9 et € = 0x80 en Windows-1252.
        assertTrue(pdf.contains("(\\(é\\) 5 \u0080) Tj"));
    }

    @Test
    void declaredStreamLengthMatchesTheContent() {
        byte[] bytes = new SimplePdf().text(60, 700, 11, false, "x").line(60, 500, 650).toBytes();
        String pdf = new String(bytes, StandardCharsets.ISO_8859_1);

        int declared = Integer.parseInt(pdf.replaceAll("(?s).*<< /Length (\\d+) >>.*", "$1"));
        int start = pdf.indexOf("stream\n") + "stream\n".length();
        int end = pdf.indexOf("\nendstream");

        assertEquals(end - start, declared);
    }
}
