package com.collector.collection.api;

import java.util.UUID;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminCategoryTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SecretKey secretKey;

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

    private ResultActions create(String name, String art, String authorization) throws Exception {
        return mockMvc.perform(post("/api/admin/categories")
                .header("Authorization", authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "name": "%s", "art": "%s" }
                        """.formatted(name, art)));
    }

    private String admin() {
        return TestTokens.bearer(secretKey, UUID.randomUUID(), "ADMIN");
    }

    private String user() {
        return TestTokens.bearer(secretKey, UUID.randomUUID(), "USER");
    }

    private String uniqueName() {
        return "Catégorie " + UUID.randomUUID().toString().substring(0, 8);
    }
}
