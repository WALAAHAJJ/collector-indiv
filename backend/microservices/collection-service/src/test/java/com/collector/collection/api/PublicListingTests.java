package com.collector.collection.api;

import com.collector.collection.repository.CategoryRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static com.collector.collection.api.PurchaseFlowSupport.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Fiche publique d'une annonce (page de détail) : visible sans connexion si elle est approuvée ou vendue. */
@SpringBootTest
@AutoConfigureMockMvc
class PublicListingTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private PurchaseFlowSupport flow;

    @BeforeEach
    void setUp() {
        flow = new PurchaseFlowSupport(mockMvc, categoryRepository);
    }

    @Test
    void anApprovedListingIsPublicWithoutLogin() throws Exception {
        String id = flow.createListing(seller, "Montre");

        mockMvc.perform(get("/api/collectibles/catalog/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Montre"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.ownerId").value(seller.toString()));
    }

    @Test
    void aSoldListingStaysVisibleAsSold() throws Exception {
        String id = flow.createListing(seller, "Montre");
        flow.buy(buyer, id);

        mockMvc.perform(get("/api/collectibles/catalog/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SOLD"));
    }

    @Test
    void aListingWaitingForReviewDoesNotExistForThePublic() throws Exception {
        String body = """
                {"name":"Coffret d'or","category":"%s","description":"Ensemble de pièces anciennes",
                 "price":6000.00,"shippingCost":10.00,"condition":"GOOD"}
                """;
        String category = flow.category();
        String response = mockMvc.perform(post("/api/collectibles")
                        .with(user(seller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.formatted(category)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_REVIEW"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");

        mockMvc.perform(get("/api/collectibles/catalog/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void anUnknownListingIsNotFound() throws Exception {
        mockMvc.perform(get("/api/collectibles/catalog/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void aMalformedIdIsRejected() throws Exception {
        mockMvc.perform(get("/api/collectibles/catalog/pas-un-uuid"))
                .andExpect(status().isBadRequest());
    }
}
