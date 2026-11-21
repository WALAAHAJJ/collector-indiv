package com.collector.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Service de paiement : il reçoit une carte et un montant, applique les contrôles d'une vraie carte
 * (simulation : aucun argent ne bouge) et garde la trace de chaque paiement, remboursable ensuite.
 */
@SpringBootApplication
public class PaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
