package com.collector.collection.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Appelle le service de paiement en HTTP. Le jeton de connexion de l'acheteur est transmis tel quel :
 * le service de paiement sait ainsi qui paie, sans secret partagé entre les deux services.
 *
 * <p>Un refus de la banque (402) devient {@link PaymentDeclinedException} ; toute autre réponse en erreur,
 * un délai dépassé ou un service arrêté devient {@link PaymentUnavailableException}.
 */
@Component
public class RemotePaymentGateway implements PaymentGateway {

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT = new ParameterizedTypeReference<>() {
    };

    private final RestClient client;

    public RemotePaymentGateway(
            @Value("${app.payment.url}") String baseUrl,
            @Value("${app.payment.timeout:5s}") Duration timeout
    ) {
        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(timeout).build());
        requestFactory.setReadTimeout(timeout);

        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    @Override
    public PaymentReceipt charge(CardDetails card, BigDecimal amount) {
        Map<String, Object> request = Map.of(
                "amount", amount,
                "cardNumber", card.number(),
                "cardHolder", card.holder(),
                "expiry", card.expiry(),
                "cvc", card.cvc()
        );

        Reply reply = call(HttpMethod.POST, "/api/payments", request);

        if (reply.status() == 402) {
            throw new PaymentDeclinedException(reply.message("Paiement refusé."));
        }

        Object id = reply.body().get("id");
        if (reply.status() / 100 != 2 || id == null) {
            throw new PaymentUnavailableException("Réponse inattendue du service de paiement (" + reply.status() + ").");
        }

        return new PaymentReceipt(id.toString());
    }

    @Override
    public void refund(String paymentId) {
        UUID id;
        try {
            id = UUID.fromString(paymentId);
        } catch (IllegalArgumentException exception) {
            throw new PaymentUnavailableException("Identifiant de paiement invalide.", exception);
        }

        Reply reply = call(HttpMethod.POST, "/api/payments/" + id + "/refund", null);

        if (reply.status() / 100 != 2) {
            throw new PaymentUnavailableException("Remboursement refusé par le service de paiement (" + reply.status() + ").");
        }
    }

    private Reply call(HttpMethod method, String path, Object body) {
        try {
            RestClient.RequestBodySpec spec = client.method(method).uri(path)
                    .headers(headers -> bearerToken().ifPresent(headers::setBearerAuth));

            if (body != null) {
                spec = spec.contentType(MediaType.APPLICATION_JSON).body(body);
            }

            return spec.exchange((request, response) ->
                    new Reply(response.getStatusCode().value(), readJson(response)));
        } catch (RestClientException exception) {
            throw new PaymentUnavailableException("Service de paiement injoignable.", exception);
        }
    }

    /** Un corps absent ou qui n'est pas du JSON (page d'erreur, par exemple) vaut « vide ». */
    private static Map<String, Object> readJson(org.springframework.web.client.RestClient.RequestHeadersSpec.ConvertibleClientHttpResponse response) {
        try {
            Map<String, Object> json = response.bodyTo(JSON_OBJECT);
            return json == null ? Map.of() : json;
        } catch (RuntimeException exception) {
            return Map.of();
        }
    }

    private static java.util.Optional<String> bearerToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        return authentication instanceof JwtAuthenticationToken jwt
                ? java.util.Optional.of(jwt.getToken().getTokenValue())
                : java.util.Optional.empty();
    }

    private record Reply(int status, Map<String, Object> body) {

        /** Le message de l'erreur, tel que le service de paiement l'a écrit (« detail » ou « message »). */
        String message(String fallback) {
            for (String key : new String[]{"detail", "message"}) {
                Object value = body.get(key);
                if (value instanceof String text && !text.isBlank()) {
                    return text;
                }
            }
            return fallback;
        }
    }
}
