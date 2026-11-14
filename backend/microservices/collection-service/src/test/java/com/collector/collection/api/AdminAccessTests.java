package com.collector.collection.api;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestJwtConfig.class)
class AdminAccessTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminRoutesRequireAToken() throws Exception {
        mockMvc.perform(get("/api/admin/collectibles"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminRoutesRejectOrdinaryUsers() throws Exception {
        mockMvc.perform(get("/api/admin/collectibles")
                        .header("Authorization", TestTokens.bearer(UUID.randomUUID(), "USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminRoutesRejectTokensWithoutRole() throws Exception {
        mockMvc.perform(get("/api/admin/collectibles")
                        .header("Authorization", TestTokens.bearer(UUID.randomUUID(), null)))
                .andExpect(status().isForbidden());
    }
}
