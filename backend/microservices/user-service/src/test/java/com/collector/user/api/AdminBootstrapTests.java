package com.collector.user.api;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.admin.username=Chef",
        "app.admin.email=Chef@Collector.local",
        "app.admin.password=motdepasse-admin"
})
@AutoConfigureMockMvc
class AdminBootstrapTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminAccountIsCreatedAtStartupAndCanLogIn() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "chef",
                                  "password": "motdepasse-admin"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        String token = body.split("\"accessToken\":\"")[1].split("\"")[0];
        String payload = new String(
                Base64.getUrlDecoder().decode(token.split("\\.")[1]),
                StandardCharsets.UTF_8);

        assertTrue(payload.contains("\"role\":\"ADMIN\""), payload);
    }

    @Test
    void theAdminUsernameCannotBeRegisteredAgain() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "chef",
                                  "email": "autre@example.com",
                                  "password": "motdepasse123"
                                }
                                """))
                .andExpect(status().isConflict());
    }
}
