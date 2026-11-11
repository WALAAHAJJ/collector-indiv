package com.collector.user.api;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthRoleTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void newAccountGetsUserRoleInToken() throws Exception {
        String username = "role" + UUID.randomUUID().toString().substring(0, 8);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "email": "%s@example.com",
                                  "password": "motdepasse123"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        String token = body.split("\"accessToken\":\"")[1].split("\"")[0];
        String payload = new String(
                Base64.getUrlDecoder().decode(token.split("\\.")[1]),
                StandardCharsets.UTF_8);

        assertTrue(payload.contains("\"role\":\"USER\""), payload);
    }
}
