package com.collector.collection.domain;

import java.util.Optional;

/**
 * Reconnaît le format d'une photo d'après ses premiers octets, sans faire confiance
 * au type annoncé par le navigateur ni au nom du fichier.
 */
public final class PhotoFormat {

    /** Taille maximale d'une photo : 2 Mo. */
    public static final int MAX_BYTES = 2 * 1024 * 1024;

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP = {'W', 'E', 'B', 'P'};
    private static final int WEBP_MARKER_OFFSET = 8;

    private PhotoFormat() {
    }

    /** Renvoie le type MIME (image/jpeg, image/png ou image/webp), ou rien si le format n'est pas accepté. */
    public static Optional<String> detect(byte[] data) {
        if (data == null) {
            return Optional.empty();
        }

        if (startsWith(data, JPEG, 0)) {
            return Optional.of("image/jpeg");
        }

        if (startsWith(data, PNG, 0)) {
            return Optional.of("image/png");
        }

        if (startsWith(data, RIFF, 0) && startsWith(data, WEBP, WEBP_MARKER_OFFSET)) {
            return Optional.of("image/webp");
        }

        return Optional.empty();
    }

    private static boolean startsWith(byte[] data, byte[] prefix, int offset) {
        if (data.length < offset + prefix.length) {
            return false;
        }

        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) {
                return false;
            }
        }

        return true;
    }
}
