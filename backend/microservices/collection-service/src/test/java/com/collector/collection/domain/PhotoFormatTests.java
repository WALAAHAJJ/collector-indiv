package com.collector.collection.domain;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PhotoFormatTests {

    private static byte[] bytes(int... values) {
        byte[] result = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            result[i] = (byte) values[i];
        }
        return result;
    }

    @Test
    void recognizesJpeg() {
        assertEquals(Optional.of("image/jpeg"),
                PhotoFormat.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0x00)));
    }

    @Test
    void recognizesPng() {
        assertEquals(Optional.of("image/png"),
                PhotoFormat.detect(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00)));
    }

    @Test
    void recognizesWebp() {
        byte[] data = "RIFF....WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);

        assertEquals(Optional.of("image/webp"), PhotoFormat.detect(data));
    }

    @Test
    void rejectsOtherRiffContainers() {
        byte[] wave = "RIFF....WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1);

        assertEquals(Optional.empty(), PhotoFormat.detect(wave));
    }

    @Test
    void rejectsScriptsAndHtmlEvenWithAnImageName() {
        byte[] html = "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8);

        assertEquals(Optional.empty(), PhotoFormat.detect(html));
    }

    @Test
    void rejectsGif() {
        assertEquals(Optional.empty(),
                PhotoFormat.detect("GIF89a....".getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    void rejectsEmptyOrTruncatedData() {
        assertEquals(Optional.empty(), PhotoFormat.detect(new byte[0]));
        assertEquals(Optional.empty(), PhotoFormat.detect(bytes(0xFF, 0xD8)));
        assertEquals(Optional.empty(), PhotoFormat.detect(null));
    }

    @Test
    void limitsPhotosToTwoMegabytes() {
        assertEquals(2_097_152, PhotoFormat.MAX_BYTES);
    }
}
