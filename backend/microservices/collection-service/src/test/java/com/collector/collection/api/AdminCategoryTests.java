package com.collector.collection.api;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestJwtConfig.class)
class AdminCategoryTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminCreatesACategoryVisibleToEveryone() throws Exception {
        String name = uniqueName();

        create(name, "STAMPS", admin())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.art").value("STAMPS"));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='%s')]".formatted(name)).exists());
    }

    @Test
    void categoryNamesAreUniqueIgnoringCase() throws Exception {
        String name = uniqueName();
        create(name, "OTHER", admin()).andExpect(status().isCreated());

        create(name.toUpperCase(), "COINS", admin()).andExpect(status().isConflict());
    }

    @Test
    void rejectsABlankName() throws Exception {
        create("   ", "OTHER", admin()).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAnUnknownIllustration() throws Exception {
        create(uniqueName(), "NIMPORTEQUOI", admin()).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAMissingIllustration() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "%s" }
                                """.formatted(uniqueName())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ordinaryUsersCannotCreateCategories() throws Exception {
        create(uniqueName(), "OTHER", user()).andExpect(status().isForbidden());
    }

    @Test
    void creatingACategoryRequiresAToken() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Sans jeton", "art": "OTHER" }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminDeletesAnUnusedCategory() throws Exception {
        String name = uniqueName();
        String id = extractId(create(name, "OTHER", admin()).andExpect(status().isCreated()).andReturn());

        mockMvc.perform(delete("/api/admin/categories/{id}", id).header("Authorization", admin()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='%s')]".formatted(name)).isEmpty());
    }

    @Test
    void deletingAnUnknownCategoryIsNotFound() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/{id}", UUID.randomUUID())
                        .header("Authorization", admin()))
                .andExpect(status().isNotFound());
    }

    @Test
    void aCategoryUsedByAListingCannotBeDeleted() throws Exception {
        String name = uniqueName();
        String id = extractId(create(name, "COINS", admin()).andExpect(status().isCreated()).andReturn());

        mockMvc.perform(post("/api/collectibles")
                        .with(jwt().jwt(token -> token.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Un lot à vendre",
                                  "category": "%s",
                                  "description": "Très bon état",
                                  "price": 20.00,
                                  "shippingCost": 3.00,
                                  "condition": "GOOD"
                                }
                                """.formatted(name)))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/admin/categories/{id}", id).header("Authorization", admin()))
                .andExpect(status().isConflict());
    }

    @Test
    void ordinaryUsersCannotDeleteCategories() throws Exception {
        String id = extractId(create(uniqueName(), "OTHER", admin()).andExpect(status().isCreated()).andReturn());

        mockMvc.perform(delete("/api/admin/categories/{id}", id).header("Authorization", user()))
                .andExpect(status().isForbidden());
    }

    private ResultActions create(String name, String art, String authorization) throws Exception {
        return mockMvc.perform(post("/api/admin/categories")
                .header("Authorization", authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "name": "%s", "art": "%s" }
                        """.formatted(name, art)));
    }

    private String admin() {
        return TestTokens.bearer(UUID.randomUUID(), "ADMIN");
    }

    private String user() {
        return TestTokens.bearer(UUID.randomUUID(), "USER");
    }

    private String extractId(MvcResult result) throws Exception {
        String response = result.getResponse().getContentAsString();
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(response);

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de la catégorie");
        return matcher.group(1);
    }

    private String uniqueName() {
        return "Catégorie " + UUID.randomUUID().toString().substring(0, 8);
    }
}
