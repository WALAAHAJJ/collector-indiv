package com.collector.collection.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Transforme les rôles du realm Keycloak en autorités Spring Security.
 *
 * <p>Keycloak range les rôles du realm dans la revendication {@code realm_access.roles} du jeton.
 * Le rôle {@code ADMIN} devient l'autorité {@code ROLE_ADMIN}, que {@code hasRole("ADMIN")} reconnaît.
 * Un jeton sans cette revendication n'a aucun rôle : il reste valable, mais n'ouvre aucune route réservée.
 */
public class KeycloakRealmRolesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return List.of();
        }

        return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .<GrantedAuthority>map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .toList();
    }
}
