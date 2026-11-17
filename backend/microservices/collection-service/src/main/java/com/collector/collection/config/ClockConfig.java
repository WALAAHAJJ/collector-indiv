package com.collector.collection.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/** L'horloge est un bean pour que les tests puissent la figer (date d'expiration d'une carte, par exemple). */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
