package com.collector.user.api;

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
import org.springframework.test.web.servlet.ResultActions;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

    private static final String PASSWORD = "motdepasse123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldRegisterAndReturnToken() throws Exception {
        String username = uniqueUsername();

        register(username, username + "@example.com")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.username").value(username));
    }

    @Test
    void shouldRejectDuplicateUsername() throws Exception {
        String username = uniqueUsername();

        register(username, username + "@example.com").andExpect(status().isCreated());

        register(username, "autre-" + username + "@example.com")
                .andExpect(status().isConflict());
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {
        String username = uniqueUsername();
        String email = username + "@example.com";

        register(username, email).andExpect(status().isCreated());

        register(uniqueUsername(), email).andExpect(status().isConflict());
    }

    @Test
    void shouldLoginWithCorrectPassword() throws Exception {
        String username = uniqueUsername();
        register(username, username + "@example.com").andExpect(status().isCreated());

        login(username, PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void shouldRejectLoginWithWrongPassword() throws Exception {
        String username = uniqueUsername();
        register(username, username + "@example.com").andExpect(status().isCreated());

        login(username, "mauvais-mot-de-passe").andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectMeWithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnCurrentUserWithValidToken() throws Exception {
        String username = uniqueUsername();

        MvcResult result = register(username, username + "@example.com")
                .andExpect(status().isCreated())
                .andReturn();

        String token = extractToken(result);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username));
    }

    private ResultActions register(String username, String email) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "username": "%s",
                          "email": "%s",
                          "password": "%s"
                        }
                        """.formatted(username, email, PASSWORD)));
    }

    private ResultActions login(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "username": "%s",
                          "password": "%s"
                        }
                        """.formatted(username, password)));
    }

    private String uniqueUsername() {
        return "user" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String extractToken(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        Matcher matcher = Pattern.compile("\"accessToken\":\"([^\"]+)\"").matcher(body);
        assertTrue(matcher.find());
        return matcher.group(1);
    }
}
