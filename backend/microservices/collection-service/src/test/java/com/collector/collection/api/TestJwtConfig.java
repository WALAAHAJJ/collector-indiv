package com.collector.collection.api;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Remplace le téléchargement des clés de Keycloak par la clé publique des tests, pour vérifier
 * de vrais jetons signés sans serveur Keycloak. Le contrôle de l'émetteur et de l'expiration est conservé.
 */
@TestConfiguration
class TestJwtConfig {

    @Bean
    @Primary
    JwtDecoder testJwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(TestTokens.publicKey()).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(TestTokens.ISSUER));
        return decoder;
    }
}
