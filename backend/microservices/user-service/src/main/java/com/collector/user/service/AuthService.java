package com.collector.user.service;

import com.collector.user.api.dto.AuthResponse;
import com.collector.user.api.dto.LoginRequest;
import com.collector.user.api.dto.RegisterRequest;
import com.collector.user.api.dto.UserResponse;
import com.collector.user.domain.Account;
import com.collector.user.repository.AccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {

    private static final long TOKEN_TTL_SECONDS = 900;

    private final AccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    public AuthService(
            AccountRepository repository,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder
    ) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (repository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom d’utilisateur existe déjà.");
        }
        if (repository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette adresse e-mail est déjà utilisée.");
        }

        Account account = repository.save(new Account(
                username,
                email,
                passwordEncoder.encode(request.password())
        ));

        return createAuthResponse(account);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);

        Account account = repository.findByUsername(username)
                .filter(found -> passwordEncoder.matches(
                        request.password(),
                        found.getPasswordHash()
                ))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Nom d’utilisateur ou mot de passe incorrect."
                ));

        return createAuthResponse(account);
    }

    private AuthResponse createAuthResponse(Account account) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("collector-user-service")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(TOKEN_TTL_SECONDS))
                .subject(account.getId().toString())
                .claim("username", account.getUsername())
                .claim("email", account.getEmail())
                .claim("role", account.getRole().name())
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(header, claims)
        ).getTokenValue();

        UserResponse user = new UserResponse(
                account.getId(),
                account.getUsername(),
                account.getEmail(),
                account.getRole().name()
        );

        return new AuthResponse(token, "Bearer", TOKEN_TTL_SECONDS, user);
    }
}
