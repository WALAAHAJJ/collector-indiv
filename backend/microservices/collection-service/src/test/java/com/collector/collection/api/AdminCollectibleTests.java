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

    private String admin() {
        return TestTokens.bearer(secretKey, UUID.randomUUID(), "ADMIN");
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
