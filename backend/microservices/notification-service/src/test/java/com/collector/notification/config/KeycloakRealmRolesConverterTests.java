package com.collector.notification.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KeycloakRealmRolesConverterTests {

    private final KeycloakRealmRolesConverter converter = new KeycloakRealmRolesConverter();

    private Jwt token(Map<String, Object> claims) {
        Jwt.Builder builder = Jwt.withTokenValue("jeton")
                .header("alg", "RS256")
                .issuedAt(Instant.parse("2026-11-14T10:00:00Z"))
                .claim("sub", "utilisateur");
        claims.forEach(builder::claim);
        return builder.build();
    }

    private List<String> authorities(Jwt jwt) {
        return converter.convert(jwt).stream().map(GrantedAuthority::getAuthority).toList();
    }

    @Test
    void realmRolesBecomeRoleAuthorities() {
        Jwt jwt = token(Map.of("realm_access", Map.of("roles", List.of("ADMIN", "default-roles-collector"))));

        assertEquals(List.of("ROLE_ADMIN", "ROLE_default-roles-collector"), authorities(jwt));
    }

    @Test
    void tokenWithoutRealmAccessHasNoRole() {
        assertTrue(authorities(token(Map.of())).isEmpty());
    }

    @Test
    void realmAccessWithoutRolesHasNoRole() {
        assertTrue(authorities(token(Map.of("realm_access", Map.of()))).isEmpty());
    }

    @Test
    void rolesThatAreNotTextAreIgnored() {
        Jwt jwt = token(Map.of("realm_access", Map.of("roles", List.of(42, "ADMIN"))));

        assertEquals(List.of("ROLE_ADMIN"), authorities(jwt));
    }
}
