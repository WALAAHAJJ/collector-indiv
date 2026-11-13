package com.collector.collection.api;

import java.util.UUID;

import com.collector.collection.domain.Category;
import com.collector.collection.domain.CategoryArt;
import com.collector.collection.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CatalogTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void catalogIsPublicAndShowsOnlyApprovedListings() throws Exception {
        String category = "cat" + UUID.randomUUID().toString().substring(0, 8);
        categoryRepository.save(new Category(category, CategoryArt.OTHER));

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
        categoryRepository.save(new Category(category, CategoryArt.OTHER));

        create(category, "Timbre rare", "Série complète").andExpect(status().isCreated());
        create(category, "Carte postale", "Vue de Paris").andExpect(status().isCreated());

        mockMvc.perform(get("/api/collectibles/catalog")
                        .param("category", category)
                        .param("search", "TIMBRE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Timbre rare"));
    }

    private ResultActions create(String category, String name, String description) throws Exception {
        return mockMvc.perform(post("/api/collectibles")
                .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "name": "%s",
                          "category": "%s",
                          "description": "%s",
                          "price": 20.00,
                          "shippingCost": 3.00,
                          "condition": "GOOD"
                        }
                        """.formatted(name, category, description)));
    }
}
