package com.collector.collection.repository;

import com.collector.collection.domain.ListingPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ListingPhotoRepository extends JpaRepository<ListingPhoto, UUID> {
}
