package com.collector.collection.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Photo d'une annonce : une seule par annonce, qui partage l'identifiant de celle-ci. */
@Entity
@Table(name = "listing_photos")
public class ListingPhoto {

    @Id
    private UUID collectibleId;

    @Column(nullable = false, length = 20)
    private String contentType;

    @Column(nullable = false, length = PhotoFormat.MAX_BYTES)
    private byte[] data;

    protected ListingPhoto() {
    }

    public ListingPhoto(UUID collectibleId, String contentType, byte[] data) {
        this.collectibleId = collectibleId;
        this.contentType = contentType;
        this.data = data;
    }

    public UUID getCollectibleId() {
        return collectibleId;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getData() {
        return data;
    }
}
