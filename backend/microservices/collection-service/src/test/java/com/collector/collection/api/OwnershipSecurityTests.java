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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OwnershipSecurityTests {

    private static final String LISTING = """
            {
              "name": "Figurine",
              "category": "Jouets",
              "description": "Figurine d’époque",
              "price": 40.00,
              "shippingCost": 3.00,
              "condition": "GOOD"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rejectsRequestsWithoutToken() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/collectibles").param("ownerId", UUID.randomUUID().toString()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidToken() throws Exception {
        mockMvc.perform(get("/api/collectibles")
                        .header("Authorization", "Bearer n-importe-quoi")
                        .param("ownerId", UUID.randomUUID().toString()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void catalogStaysPublic() throws Exception {
        mockMvc.perform(get("/api/collectibles/catalog"))
                .andExpect(status().isOk());
    }

    @Test
    void forbidsReadingSomeoneElsesListings() throws Exception {
        mockMvc.perform(get("/api/collectibles")
                        .with(user(UUID.randomUUID().toString()))
                        .param("ownerId", UUID.randomUUID().toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void forbidsEditingOrDeletingSomeoneElsesListing() throws Exception {
        String owner = UUID.randomUUID().toString();
        String intruder = UUID.randomUUID().toString();

        MvcResult created = mockMvc.perform(post("/api/collectibles")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING))
                .andExpect(status().isCreated())
                .andReturn();

        String id = extractId(created);

        mockMvc.perform(put("/api/collectibles/{id}", id)
                        .with(user(intruder))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/collectibles/{id}", id).with(user(intruder)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/collectibles/{id}", id).with(user(owner)))
                .andExpect(status().isNoContent());
    }

    @Test
    void hidesNonApprovedListingFromOtherUsers() throws Exception {
        String owner = UUID.randomUUID().toString();

        MvcResult created = mockMvc.perform(post("/api/collectibles")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING.replace("Figurine d’époque", "Écrire à vendeur@mail.com")))
                .andExpect(status().isCreated())
                .andReturn();

        String id = extractId(created);

        mockMvc.perform(get("/api/collectibles/{id}", id).with(user(UUID.randomUUID().toString())))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/collectibles/{id}", id).with(user(owner)))
                .andExpect(status().isOk());
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
