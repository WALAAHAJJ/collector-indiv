package com.collector.collection.api;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ListingCategoryTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void aListingNeedsAnExistingCategory() throws Exception {
        create("Catégorie qui n’existe pas", user(UUID.randomUUID()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theCategoryIsMatchedIgnoringCaseAndStoredWithItsOfficialName() throws Exception {
        create("timbres", user(UUID.randomUUID()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("Timbres"));
    }

    @Test
    void anUpdateAlsoNeedsAnExistingCategory() throws Exception {
        UUID owner = UUID.randomUUID();
        MvcResult created = create("Pièces", user(owner)).andExpect(status().isCreated()).andReturn();
        String id = extractId(created);

        update(id, "Catégorie qui n’existe pas", user(owner)).andExpect(status().isBadRequest());

        update(id, "autres objets", user(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("Autres objets"));
    }

    private ResultActions create(String category, RequestPostProcessor user) throws Exception {
        return mockMvc.perform(post("/api/collectibles")
                .with(user)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(category)));
    }

    private ResultActions update(String id, String category, RequestPostProcessor user) throws Exception {
        return mockMvc.perform(put("/api/collectibles/{id}", id)
                .with(user)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(category)));
    }

    private String body(String category) {
        return """
                {
                  "name": "Un lot à vendre",
                  "category": "%s",
                  "description": "Très bon état",
                  "price": 20.00,
                  "shippingCost": 3.00,
                  "condition": "GOOD"
                }
                """.formatted(category);
    }

    private RequestPostProcessor user(UUID userId) {
        return jwt().jwt(token -> token.subject(userId.toString()));
    }

    private String extractId(MvcResult result) throws Exception {
        String response = result.getResponse().getContentAsString();
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(response);

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de l’annonce");
        return matcher.group(1);
    }
}
