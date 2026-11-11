package com.collector.collection.api;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CollectibleControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateAndListCollectible() throws Exception {
        String ownerId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/collectibles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerId": "%s",
                                  "name": "Vinyle",
                                  "category": "Musique",
                                  "description": "Un disque de collection"
                                }
                                """.formatted(ownerId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Vinyle"));

        mockMvc.perform(get("/api/collectibles").param("ownerId", ownerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Vinyle"));
    }

    @Test
    void shouldRejectCollectibleWithBlankName() throws Exception {
        mockMvc.perform(post("/api/collectibles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerId": "%s",
                                  "name": " ",
                                  "category": "Musique",
                                  "description": "Un disque de collection"
                                }
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isBadRequest());
    }
}
