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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CollectibleControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateReadUpdateAndDeleteCollectible() throws Exception {
        String ownerId = UUID.randomUUID().toString();

        MvcResult createResult = mockMvc.perform(post("/api/collectibles")
                        .with(user(ownerId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Vinyle",
                                  "category": "Musique",
                                  "description": "Un disque de collection",
                                  "price": 25.00,
                                  "shippingCost": 4.50,
                                  "condition": "VERY_GOOD"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerId").value(ownerId))
                .andExpect(jsonPath("$.name").value("Vinyle"))
                .andExpect(jsonPath("$.price").value(25.0))
                .andExpect(jsonPath("$.shippingCost").value(4.5))
                .andExpect(jsonPath("$.condition").value("VERY_GOOD"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();

        String id = extractId(createResult);

        mockMvc.perform(get("/api/collectibles/{id}", id).with(user(ownerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").value(ownerId))
                .andExpect(jsonPath("$.name").value("Vinyle"));

        mockMvc.perform(put("/api/collectibles/{id}", id)
                        .with(user(ownerId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Vinyle jazz",
                                  "category": "Jazz",
                                  "description": "Édition remasterisée",
                                  "price": 30.00,
                                  "shippingCost": 5.00,
                                  "condition": "GOOD"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").value(ownerId))
                .andExpect(jsonPath("$.name").value("Vinyle jazz"))
                .andExpect(jsonPath("$.category").value("Jazz"))
                .andExpect(jsonPath("$.price").value(30.0))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(get("/api/collectibles")
                        .with(user(ownerId))
                        .param("ownerId", ownerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Vinyle jazz"));

        mockMvc.perform(delete("/api/collectibles/{id}", id).with(user(ownerId)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/collectibles/{id}", id).with(user(ownerId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnNotFoundForUnknownCollectible() throws Exception {
        String unknownId = UUID.randomUUID().toString();
        String userId = UUID.randomUUID().toString();

        mockMvc.perform(get("/api/collectibles/{id}", unknownId).with(user(userId)))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/collectibles/{id}", unknownId)
                        .with(user(userId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Vinyle",
                                  "category": "Musique",
                                  "description": "Description",
                                  "price": 10.00,
                                  "shippingCost": 0.00,
                                  "condition": "GOOD"
                                }
                                """))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/collectibles/{id}", unknownId).with(user(userId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldRejectCollectibleWithBlankName() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .with(user(UUID.randomUUID().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(" ", "25.00", "\"GOOD\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectCollectibleWithZeroPrice() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .with(user(UUID.randomUUID().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Vinyle", "0", "\"GOOD\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectCollectibleWithoutCondition() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .with(user(UUID.randomUUID().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Vinyle", "25.00", "null")))
                .andExpect(status().isBadRequest());
    }

    private String body(String name, String price, String condition) {
        return """
                {
                  "name": "%s",
                  "category": "Musique",
                  "description": "Un disque de collection",
                  "price": %s,
                  "shippingCost": 4.50,
                  "condition": %s
                }
                """.formatted(name, price, condition);
    }

    private RequestPostProcessor user(String userId) {
        return jwt().jwt(token -> token.subject(userId));
    }

    private String extractId(MvcResult result) throws Exception {
        String response = result.getResponse().getContentAsString();
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(response);

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de l’objet");
        return matcher.group(1);
    }
}
