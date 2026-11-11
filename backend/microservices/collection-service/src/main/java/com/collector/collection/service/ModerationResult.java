package com.collector.collection.service;

import com.collector.collection.domain.ListingStatus;

public record ModerationResult(ListingStatus status, String reason) {
}
