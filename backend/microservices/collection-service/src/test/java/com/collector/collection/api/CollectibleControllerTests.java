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

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CollectibleControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateReadUpdateAndDeleteCollectible() throws Exception {
        String ownerId = UUID.randomUUID().toString();

        MvcResult createResult = mockMvc.perform(post("/api/collectibles")
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
                .andExpect(jsonPath("$.name").value("Vinyle"))
                .andReturn();

        String id = extractId(createResult);

        mockMvc.perform(get("/api/collectibles/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").value(ownerId))
                .andExpect(jsonPath("$.name").value("Vinyle"));

        mockMvc.perform(put("/api/collectibles/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Vinyle jazz",
                                  "category": "Jazz",
                                  "description": "Édition remasterisée"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerId").value(ownerId))
                .andExpect(jsonPath("$.name").value("Vinyle jazz"))
                .andExpect(jsonPath("$.category").value("Jazz"));

        mockMvc.perform(get("/api/collectibles").param("ownerId", ownerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Vinyle jazz"));

        mockMvc.perform(delete("/api/collectibles/{id}", id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/collectibles/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnNotFoundForUnknownCollectible() throws Exception {
        String unknownId = UUID.randomUUID().toString();

        mockMvc.perform(get("/api/collectibles/{id}", unknownId))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/collectibles/{id}", unknownId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Vinyle",
                                  "category": "Musique",
                                  "description": "Description"
                                }
                                """))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/collectibles/{id}", unknownId))
                .andExpect(status().isNotFound());
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

    private String extractId(MvcResult result) throws Exception {
        String response = result.getResponse().getContentAsString();
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(response);

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de l’objet");
        return matcher.group(1);
    }
}
