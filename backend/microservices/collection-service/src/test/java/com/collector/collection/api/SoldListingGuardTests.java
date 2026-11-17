package com.collector.collection.api;

import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ItemCondition;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.repository.CollectibleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Une annonce vendue est figée : ni modification, ni suppression, ni retour en vente par la modération. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestJwtConfig.class)
class SoldListingGuardTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CollectibleRepository repository;

    private final UUID seller = UUID.randomUUID();
    private Collectible sold;

    @BeforeEach
    void sellOneListing() {
        sold = new Collectible(seller, "Montre de gousset", "Montres", "Belle montre",
                new BigDecimal("80.00"), new BigDecimal("5.00"), ItemCondition.GOOD);
        sold.applyModeration(ListingStatus.APPROVED, null);
        sold.markSold();
        sold = repository.save(sold);
    }

    @Test
    void soldListingLeavesTheCatalog() throws Exception {
        mockMvc.perform(get("/api/collectibles/catalog").param("search", "Montre de gousset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void ownerSeesTheSoldStatus() throws Exception {
        mockMvc.perform(get("/api/collectibles/" + sold.getId())
                        .with(jwt().jwt(token -> token.subject(seller.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SOLD"));
    }

    @Test
    void ownerCannotEditASoldListing() throws Exception {
        mockMvc.perform(put("/api/collectibles/" + sold.getId())
                        .with(jwt().jwt(token -> token.subject(seller.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Autre nom","category":"%s","description":"x",
                                 "price":10.00,"shippingCost":1.00,"condition":"GOOD"}
                                """.formatted(sold.getCategory())))
                .andExpect(status().isConflict());

        assertEquals("Montre de gousset", repository.findById(sold.getId()).orElseThrow().getName());
    }

    @Test
    void ownerCannotDeleteASoldListing() throws Exception {
        mockMvc.perform(delete("/api/collectibles/" + sold.getId())
                        .with(jwt().jwt(token -> token.subject(seller.toString()))))
                .andExpect(status().isConflict());

        assertEquals(ListingStatus.SOLD, repository.findById(sold.getId()).orElseThrow().getStatus());
    }

    @Test
    void adminCannotPutASoldListingBackOnSale() throws Exception {
        mockMvc.perform(post("/api/admin/collectibles/" + sold.getId() + "/approve")
                        .header("Authorization", TestTokens.bearer(UUID.randomUUID(), "ADMIN")))
                .andExpect(status().isConflict());

        assertEquals(ListingStatus.SOLD, repository.findById(sold.getId()).orElseThrow().getStatus());
    }
}
