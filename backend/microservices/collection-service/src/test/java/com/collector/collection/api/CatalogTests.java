package com.collector.collection.api;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CatalogTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void catalogShowsOnlyApprovedListings() throws Exception {
        String category = "cat" + UUID.randomUUID().toString().substring(0, 8);

        create(category, "Pièce ancienne", "Belle pièce de collection").andExpect(status().isCreated());
        create(category, "Pièce suspecte", "Contactez-moi sur vendeur@mail.com").andExpect(status().isCreated());

        mockMvc.perform(get("/api/collectibles/catalog").param("category", category))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Pièce ancienne"))
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
    }

    @Test
    void catalogFiltersBySearchText() throws Exception {
        String category = "cat" + UUID.randomUUID().toString().substring(0, 8);

        create(category, "Timbre rare", "Série complète").andExpect(status().isCreated());
        create(category, "Carte postale", "Vue de Paris").andExpect(status().isCreated());

        mockMvc.perform(get("/api/collectibles/catalog")
                        .param("category", category)
                        .param("search", "TIMBRE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Timbre rare"));
    }

    private org.springframework.test.web.servlet.ResultActions create(
            String category, String name, String description) throws Exception {
        return mockMvc.perform(post("/api/collectibles")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "ownerId": "%s",
                          "name": "%s",
                          "category": "%s",
                          "description": "%s",
                          "price": 20.00,
                          "shippingCost": 3.00,
                          "condition": "GOOD"
                        }
                        """.formatted(UUID.randomUUID(), name, category, description)));
    }
}
