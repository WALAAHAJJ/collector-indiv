package com.collector.collection.api;

import java.util.Arrays;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.collector.collection.domain.PhotoFormat;
import com.collector.collection.repository.ListingPhotoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PhotoTests {

    private static final String LISTING = """
            {
              "name": "Pièce de 2 francs",
              "category": "Pièces",
              "description": "Belle pièce ancienne",
              "price": 12.00,
              "shippingCost": 0.00,
              "condition": "GOOD"
            }
            """;

    private static final byte[] PNG = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4
    };

    private static final byte[] JPEG = {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 5, 6, 7, 8
    };

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ListingPhotoRepository photoRepository;

    @Test
    void ownerAddsAPhotoThatVisitorsCanSeeOnAnApprovedListing() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "photo.png", PNG).with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasPhoto").value(true));

        MvcResult photo = mockMvc.perform(get("/api/collectibles/{id}/photo", id))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andReturn();

        assertArrayEquals(PNG, photo.getResponse().getContentAsByteArray());
    }

    @Test
    void listingWithoutPhotoHasNoPhotoFlag() throws Exception {
        String id = createListing(UUID.randomUUID().toString(), LISTING);

        mockMvc.perform(get("/api/collectibles/{id}/photo", id))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/collectibles/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id=='%s')].hasPhoto".formatted(id)).value(false));
    }

    @Test
    void replacingThePhotoChangesItsType() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "a.png", PNG).with(user(owner))).andExpect(status().isOk());
        mockMvc.perform(upload(id, "b.jpg", JPEG).with(user(owner))).andExpect(status().isOk());

        mockMvc.perform(get("/api/collectibles/{id}/photo", id))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"));
    }

    @Test
    void trustsTheContentAndNotTheFileName() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "photo.png", "<script>alert(1)</script>".getBytes()).with(user(owner)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAnEmptyFile() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "vide.png", new byte[0]).with(user(owner)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAPhotoOverOneMegabyte() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        byte[] big = Arrays.copyOf(PNG, PhotoFormat.MAX_BYTES + 1);

        mockMvc.perform(upload(id, "grande.png", big).with(user(owner)))
                .andExpect(status().is(413));
    }

    @Test
    void onlyTheOwnerCanChangeThePhoto() throws Exception {
        String owner = UUID.randomUUID().toString();
        String intruder = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "photo.png", PNG).with(user(intruder)))
                .andExpect(status().isForbidden());

        mockMvc.perform(upload(id, "photo.png", PNG).with(user(owner)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/collectibles/{id}/photo", id).with(user(intruder)))
                .andExpect(status().isForbidden());
    }

    @Test
    void requiresATokenToUpload() throws Exception {
        String id = createListing(UUID.randomUUID().toString(), LISTING);

        mockMvc.perform(upload(id, "photo.png", PNG))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ownerRemovesThePhoto() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "photo.png", PNG).with(user(owner))).andExpect(status().isOk());

        mockMvc.perform(delete("/api/collectibles/{id}/photo", id).with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasPhoto").value(false));

        mockMvc.perform(get("/api/collectibles/{id}/photo", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void photoOfAListingUnderReviewIsHiddenFromVisitorsAndOtherUsers() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING.replace("Belle pièce ancienne", "Écrire à vendeur@mail.com"));

        mockMvc.perform(upload(id, "photo.png", PNG).with(user(owner))).andExpect(status().isOk());

        mockMvc.perform(get("/api/collectibles/{id}/photo", id))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/collectibles/{id}/photo", id).with(user(UUID.randomUUID().toString())))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/collectibles/{id}/photo", id).with(user(owner)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/collectibles/{id}/photo", id).with(admin()))
                .andExpect(status().isOk());
    }

    @Test
    void deletingTheListingDeletesItsPhoto() throws Exception {
        String owner = UUID.randomUUID().toString();
        String id = createListing(owner, LISTING);

        mockMvc.perform(upload(id, "photo.png", PNG).with(user(owner))).andExpect(status().isOk());
        assertTrue(photoRepository.existsById(UUID.fromString(id)));

        mockMvc.perform(delete("/api/collectibles/{id}", id).with(user(owner)))
                .andExpect(status().isNoContent());

        assertFalse(photoRepository.existsById(UUID.fromString(id)));
    }

    private MockMultipartHttpServletRequestBuilder upload(
            String id, String fileName, byte[] bytes) {
        return multipart("/api/collectibles/{id}/photo", id)
                .file(new MockMultipartFile("file", fileName, "image/png", bytes));
    }

    private String createListing(String owner, String body) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/collectibles")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(created.getResponse().getContentAsString());

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de l’annonce");
        return matcher.group(1);
    }

    private RequestPostProcessor user(String userId) {
        return jwt().jwt(token -> token.subject(userId));
    }

    private RequestPostProcessor admin() {
        return jwt()
                .jwt(token -> token.subject(UUID.randomUUID().toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
