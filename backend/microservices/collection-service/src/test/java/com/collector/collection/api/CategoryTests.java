package com.collector.collection.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CategoryTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void categoriesArePublicAndIncludeTheDefaults() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name=='Timbres')].art").value("STAMPS"))
                .andExpect(jsonPath("$[?(@.name=='Pièces')].art").value("COINS"))
                .andExpect(jsonPath("$[?(@.name=='Cartes postales')].art").value("POSTCARDS"))
                .andExpect(jsonPath("$[?(@.name=='Autres objets')].art").value("OTHER"));
    }
}
