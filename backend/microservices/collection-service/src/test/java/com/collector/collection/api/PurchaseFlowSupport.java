package com.collector.collection.api;

import com.collector.collection.domain.Category;
import com.collector.collection.domain.CategoryArt;
import com.collector.collection.repository.CategoryRepository;
import com.jayway.jsonpath.JsonPath;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Outils de test : déposer une annonce validée, l'acheter, et se connecter sous un identifiant donné. */
final class PurchaseFlowSupport {

    private final MockMvc mockMvc;
    private final String category;

    PurchaseFlowSupport(MockMvc mockMvc, CategoryRepository categoryRepository) {
        this.mockMvc = mockMvc;
        this.category = "cat" + UUID.randomUUID().toString().substring(0, 8);
        categoryRepository.save(new Category(category, CategoryArt.OTHER));
    }

    String category() {
        return category;
    }

    static RequestPostProcessor user(UUID id) {
        return jwt().jwt(token -> token.subject(id.toString()));
    }

    /** Dépose une annonce à 20,00 € (port 3,00 €) qui passe la modération automatique. */
    String createListing(UUID seller, String name) throws Exception {
        String body = mockMvc.perform(post("/api/collectibles")
                        .with(user(seller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","category":"%s","description":"Belle pièce de collection",
                                 "price":20.00,"shippingCost":3.00,"condition":"GOOD"}
                                """.formatted(name, category)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(body, "$.id");
    }

    /** Achète l'annonce avec la carte de test et renvoie l'identifiant de la commande. */
    String buy(UUID buyer, String listingId) throws Exception {
        String body = mockMvc.perform(post("/api/orders")
                        .with(user(buyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"listingId":"%s","cardNumber":"4242 4242 4242 4242","cardHolder":"Walaa Test",
                                 "expiry":"12/40","cvc":"123"}
                                """.formatted(listingId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(body, "$.id");
    }

    String sell(UUID seller, UUID buyer, String name) throws Exception {
        return buy(buyer, createListing(seller, name));
    }
}
