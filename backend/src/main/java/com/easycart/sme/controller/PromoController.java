package com.easycart.sme.controller;

import com.easycart.sme.entity.Promo;
import com.easycart.sme.repository.PromoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class PromoController {

    private final PromoRepository promoRepository;

    @GetMapping("/api/promos/active")
    public ResponseEntity<Promo> getActivePromo() {
        Optional<Promo> latest = promoRepository.findFirstByOrderByCreatedAtDesc();
        if (latest.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        Promo promo = latest.get();
        // Check if older than 24 hours
        if (Instant.now().isAfter(promo.getCreatedAt().plus(24, ChronoUnit.HOURS))) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(promo);
    }

    @GetMapping("/api/admin/promos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllPromos() {
        return ResponseEntity.ok(promoRepository.findAll());
    }

    @PostMapping("/api/admin/promos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Promo> createPromo(@RequestBody Promo promo) {
        if (promo.getServiceName() == null || promo.getServiceName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        // Save as new promo (making it the latest)
        Promo saved = promoRepository.save(promo);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/api/admin/promos/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteActivePromo() {
        promoRepository.deleteAll();
        return ResponseEntity.ok().build();
    }
}
