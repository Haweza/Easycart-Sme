package com.easycart.sme.controller;

import com.easycart.sme.entity.ElectronicProduct;
import com.easycart.sme.repository.ElectronicProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * ElectronicProductController — REST endpoints for electronic product listings.
 *
 * Public:
 *   GET /api/electronics/active   — Returns up to 3 products posted within the last 3 days
 *
 * Admin-only:
 *   GET    /api/admin/electronics         — Returns all products (including expired)
 *   POST   /api/admin/electronics         — Creates a new product listing
 *   DELETE /api/admin/electronics/{id}   — Deletes a product listing by ID
 */
@RestController
@RequiredArgsConstructor
public class ElectronicProductController {

    private final ElectronicProductRepository electronicProductRepository;

    // ---- Public: Fetch active electronics (within last 3 days) ----------------

    @GetMapping("/api/electronics/active")
    public ResponseEntity<List<ElectronicProduct>> getActiveElectronics() {
        Instant threshold = Instant.now().minus(3, ChronoUnit.DAYS);
        List<ElectronicProduct> active = electronicProductRepository
                .findTop3ByCreatedAtAfterOrderByCreatedAtDesc(threshold);
        if (active.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(active);
    }

    // ---- Admin: Fetch all electronics (including expired) ---------------------

    @GetMapping("/api/admin/electronics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ElectronicProduct>> getAllElectronics() {
        List<ElectronicProduct> all = electronicProductRepository
                .findAll(org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(all);
    }

    // ---- Admin: Create a new electronics listing ------------------------------

    @PostMapping("/api/admin/electronics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ElectronicProduct> createElectronic(
            @RequestBody ElectronicProduct product) {

        if (product.getName() == null || product.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (product.getPrice() == null || product.getPrice().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (product.getImageContent() == null || product.getImageContent().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        ElectronicProduct saved = electronicProductRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ---- Admin: Delete an electronics listing by ID ---------------------------

    @DeleteMapping("/api/admin/electronics/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteElectronic(@PathVariable UUID id) {
        if (!electronicProductRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        electronicProductRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
