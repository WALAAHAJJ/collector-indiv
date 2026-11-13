package com.collector.collection.api;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ModerationFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rejectsListingContainingAnEmail() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Écrivez-moi à vendeur@mail.com", "25.00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.moderationReason").isNotEmpty());
    }

    @Test
    void sendsVeryExpensiveListingToManualReview() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Pièce unique numérotée", "7500.00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_REVIEW"));
    }

    private String body(String description, String price) {
        return """
                {
                  "name": "Figurine",
                  "category": "Timbres",
                  "description": "%s",
                  "price": %s,
                  "shippingCost": 3.00,
                  "condition": "GOOD"
                }
                """.formatted(description, price);
    }
}
