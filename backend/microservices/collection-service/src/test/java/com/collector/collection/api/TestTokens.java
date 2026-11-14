package com.collector.collection.api;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Fabrique de vrais jetons signés (RS256), de la même forme que ceux de Keycloak :
 * identifiant de l'utilisateur dans « sub », rôles du realm dans « realm_access.roles ».
 * La paire de clés est générée une fois pour tous les tests ; {@link TestJwtConfig} en donne la clé publique au service.
 */
final class TestTokens {

    static final String ISSUER = "http://localhost:8180/realms/collector";

    private static final KeyPair KEY_PAIR = generateKeyPair();

    private TestTokens() {
    }

    static RSAPublicKey publicKey() {
        return (RSAPublicKey) KEY_PAIR.getPublic();
    }

    /** Renvoie la valeur de l'en-tête Authorization ; sans rôle, le jeton n'a pas de revendication « realm_access ». */
    static String bearer(UUID userId, String role) {
        Instant now = Instant.now();

        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(600))
                .subject(userId.toString());

        if (role != null) {
            claims.claim("realm_access", Map.of("roles", List.of("default-roles-collector", role)));
        }

        RSAKey key = new RSAKey.Builder(publicKey())
                .privateKey((RSAPrivateKey) KEY_PAIR.getPrivate())
                .keyID("tests")
                .build();
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));

        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId("tests").build(),
                claims.build()
        )).getTokenValue();

        return "Bearer " + token;
    }

    private static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
