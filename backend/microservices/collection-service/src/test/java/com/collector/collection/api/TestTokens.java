package com.collector.collection.api;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.UUID;

/** Fabrique de vrais jetons signés, comme ceux du user-service, pour tester les rôles. */
final class TestTokens {

    private TestTokens() {
    }

    /** Renvoie la valeur de l'en-tête Authorization ; sans rôle, le jeton n'a pas de revendication « role ». */
    static String bearer(SecretKey key, UUID userId, String role) {
        Instant now = Instant.now();

        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer("collector-tests")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(600))
                .subject(userId.toString());

        if (role != null) {
            claims.claim("role", role);
        }

        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                claims.build()
        )).getTokenValue();

        return "Bearer " + token;
    }
}
