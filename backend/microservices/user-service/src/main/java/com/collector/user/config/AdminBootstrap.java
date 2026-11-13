package com.collector.user.config;

import com.collector.user.domain.Account;
import com.collector.user.repository.AccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Crée au démarrage le compte administrateur décrit par les variables
 * d'environnement ADMIN_USERNAME, ADMIN_EMAIL et ADMIN_PASSWORD.
 * Sans configuration, aucun compte n'est créé ; un compte existant n'est jamais modifié.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final AccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String email;
    private final String password;

    public AdminBootstrap(
            AccountRepository repository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username:}") String username,
            @Value("${app.admin.email:}") String email,
            @Value("${app.admin.password:}") String password
    ) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (username.isBlank() || email.isBlank() || password.isBlank()) {
            LOGGER.info("Aucun compte administrateur configuré.");
            return;
        }

        if (password.length() < MIN_PASSWORD_LENGTH) {
            LOGGER.warn("Le mot de passe administrateur est trop court : compte non créé.");
            return;
        }

        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);

        if (repository.existsByUsername(normalizedUsername)
                || repository.existsByEmail(normalizedEmail)) {
            LOGGER.info("Le compte administrateur existe déjà.");
            return;
        }

        Account admin = new Account(
                normalizedUsername,
                normalizedEmail,
                passwordEncoder.encode(password)
        );
        admin.makeAdmin();
        repository.save(admin);

        LOGGER.info("Compte administrateur « {} » créé.", normalizedUsername);
    }
}
