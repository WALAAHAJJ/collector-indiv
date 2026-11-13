package com.collector.collection.api;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminCollectibleTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SecretKey secretKey;

    @Test
    void adminSeesListingsWaitingForReview() throws Exception {
        String id = createPendingListing("cat" + shortId());

        mockMvc.perform(get("/api/admin/collectibles").header("Authorization", admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id=='%s')]".formatted(id)).exists());
    }

    @Test
    void adminCanFilterByStatus() throws Exception {
        createPendingListing("cat" + shortId());

        mockMvc.perform(get("/api/admin/collectibles")
                        .param("status", "PENDING_REVIEW")
                        .header("Authorization", admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.status != 'PENDING_REVIEW')]").isEmpty());
    }

    @Test
    void adminRoutesRejectAnUnknownStatus() throws Exception {
        mockMvc.perform(get("/api/admin/collectibles")
                        .param("status", "NIMPORTEQUOI")
                        .header("Authorization", admin()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminApprovesAListingWhichThenAppearsInTheCatalog() throws Exception {
        String category = "cat" + shortId();
        String id = createPendingListing(category);

        mockMvc.perform(post("/api/admin/collectibles/{id}/approve", id)
                        .header("Authorization", admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(get("/api/collectibles/catalog").param("category", category))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id));
    }

    @Test
    void adminRejectsAListingWithAReason() throws Exception {
        String category = "cat" + shortId();
        String id = createPendingListing(category);

        mockMvc.perform(post("/api/admin/collectibles/{id}/reject", id)
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "reason": "Photo non conforme à la charte" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.moderationReason").value("Photo non conforme à la charte"));

        mockMvc.perform(get("/api/collectibles/catalog").param("category", category))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectionNeedsAReason() throws Exception {
        String id = createPendingListing("cat" + shortId());

        mockMvc.perform(post("/api/admin/collectibles/{id}/reject", id)
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "reason": " " }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void approvingOrRejectingAnUnknownListingIsNotFound() throws Exception {
        String unknownId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/admin/collectibles/{id}/approve", unknownId)
                        .header("Authorization", admin()))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/admin/collectibles/{id}/reject", unknownId)
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "reason": "Hors charte" }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void ordinaryUsersCannotApprove() throws Exception {
        String id = createPendingListing("cat" + shortId());

        mockMvc.perform(post("/api/admin/collectibles/{id}/approve", id)
                        .header("Authorization", user()))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminDeletesAListingThatBreaksTheCharter() throws Exception {
        String id = createPendingListing("cat" + shortId());

        mockMvc.perform(delete("/api/admin/collectibles/{id}", id)
                        .header("Authorization", admin()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/collectibles/{id}", id)
                        .header("Authorization", admin()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingAnUnknownListingIsNotFound() throws Exception {
        mockMvc.perform(delete("/api/admin/collectibles/{id}", UUID.randomUUID())
                        .header("Authorization", admin()))
                .andExpect(status().isNotFound());
    }

    @Test
    void ordinaryUsersCannotDeleteThroughTheAdminRoute() throws Exception {
        String id = createPendingListing("cat" + shortId());

        mockMvc.perform(delete("/api/admin/collectibles/{id}", id)
                        .header("Authorization", user()))
                .andExpect(status().isForbidden());
    }

    private String admin() {
        return TestTokens.bearer(secretKey, UUID.randomUUID(), "ADMIN");
    }

    private String user() {
        return TestTokens.bearer(secretKey, UUID.randomUUID(), "USER");
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String createPendingListing(String category) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/collectibles")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Pièce rare numérotée",
                                  "category": "%s",
                                  "description": "Édition limitée",
                                  "price": 7500.00,
                                  "shippingCost": 5.00,
                                  "condition": "GOOD"
                                }
                                """.formatted(category)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_REVIEW"))
                .andReturn();

        String response = result.getResponse().getContentAsString();
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(response);

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de l’annonce");
        return matcher.group(1);
    }
}
