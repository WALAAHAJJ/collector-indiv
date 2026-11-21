package com.collector.collection.payment;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Le client HTTP du service de paiement, face à un faux serveur qui répond ce qu'on lui demande. */
class RemotePaymentGatewayTests {

    private static final CardDetails CARD = new CardDetails("4242 4242 4242 4242", "Walaa Test", "12/40", "123");

    private HttpServer server;
    private final AtomicReference<String> lastRequest = new AtomicReference<>();
    private volatile int status = 201;
    private volatile String body = "";
    private RemotePaymentGateway gateway;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String payload = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            lastRequest.set(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath() + " " + payload);
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
            if (bytes.length > 0) {
                exchange.getResponseBody().write(bytes);
            }
            exchange.close();
        });
        server.start();
        gateway = new RemotePaymentGateway("http://127.0.0.1:" + server.getAddress().getPort(), Duration.ofSeconds(2));
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void anAcceptedPaymentReturnsItsId() {
        String id = UUID.randomUUID().toString();
        body = "{\"id\":\"" + id + "\",\"status\":\"SUCCEEDED\"}";

        PaymentReceipt receipt = gateway.charge(CARD, new BigDecimal("23.00"));

        assertEquals(id, receipt.paymentId());
        assertTrue(lastRequest.get().startsWith("POST /api/payments "));
        assertTrue(lastRequest.get().contains("\"amount\":23.00"));
    }

    @Test
    void aDeclinedPaymentKeepsTheBankMessage() {
        status = 402;
        body = "{\"detail\":\"Paiement refusé par la banque.\"}";

        PaymentDeclinedException exception =
                assertThrows(PaymentDeclinedException.class, () -> gateway.charge(CARD, BigDecimal.TEN));

        assertEquals("Paiement refusé par la banque.", exception.getMessage());
    }

    @Test
    void aServerErrorMeansUnavailable() {
        status = 500;
        body = "<html>oups</html>";

        assertThrows(PaymentUnavailableException.class, () -> gateway.charge(CARD, BigDecimal.TEN));
    }

    @Test
    void aStoppedServerMeansUnavailable() {
        server.stop(0);

        assertThrows(PaymentUnavailableException.class, () -> gateway.charge(CARD, BigDecimal.TEN));
    }

    @Test
    void aRefundCallsTheRefundRoute() {
        String id = UUID.randomUUID().toString();
        status = 200;
        body = "{\"status\":\"REFUNDED\"}";

        gateway.refund(id);

        assertTrue(lastRequest.get().startsWith("POST /api/payments/" + id + "/refund"));
    }

    @Test
    void aRefusedRefundIsReported() {
        status = 409;
        body = "{\"detail\":\"déjà remboursé\"}";

        assertThrows(PaymentUnavailableException.class, () -> gateway.refund(UUID.randomUUID().toString()));
    }

    @Test
    void anInvalidPaymentIdIsRejectedBeforeAnyCall() {
        assertThrows(PaymentUnavailableException.class, () -> gateway.refund("../../admin"));
        assertEquals(null, lastRequest.get());
    }
}
