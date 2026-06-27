package com.easycart.sme.repository;

import com.easycart.sme.entity.ElectronicProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * ElectronicProductRepository — JPA repository for electronic product listings.
 * Used to query active products (created within the last 3 days).
 */
@Repository
public interface ElectronicProductRepository extends JpaRepository<ElectronicProduct, UUID> {

    /**
     * Finds up to 3 products created after the given threshold, ordered newest first.
     * Used by the public endpoint to return only active (not-yet-expired) listings.
     *
     * @param threshold Instant representing 3 days ago
     * @return list of at most 3 active ElectronicProduct entries
     */
    List<ElectronicProduct> findTop3ByCreatedAtAfterOrderByCreatedAtDesc(Instant threshold);
}
