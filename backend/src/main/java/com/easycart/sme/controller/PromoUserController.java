package com.easycart.sme.controller;

import com.easycart.sme.dto.PromoUserRequestDTO;
import com.easycart.sme.dto.PromoUserResponseDTO;
import com.easycart.sme.service.PromoUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/promo-users")
@RequiredArgsConstructor
public class PromoUserController {
    
    private final PromoUserService promoUserService;

    /**
     * Admin: Create new promo user
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromoUserResponseDTO> createPromoUser(
            @Valid @RequestBody PromoUserRequestDTO request,
            Principal principal) {
        java.util.UUID creatorId = java.util.UUID.fromString(principal.getName());
        PromoUserResponseDTO response = promoUserService.createPromoUser(request, creatorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Admin: Get pending promo users for review
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromoUserResponseDTO>> getPendingPromoUsers() {
        List<PromoUserResponseDTO> promoUsers = promoUserService.getPendingPromoUsers();
        return ResponseEntity.ok(promoUsers);
    }

    /**
     * Admin: Approve promo user
     */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromoUserResponseDTO> approvePromoUser(
            @PathVariable String id,
            Principal principal) {
        java.util.UUID approverId = java.util.UUID.fromString(principal.getName());
        PromoUserResponseDTO response = promoUserService.approvePromoUser(id, approverId);
        return ResponseEntity.ok(response);
    }

    /**
     * Admin: Reject promo user
     */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromoUserResponseDTO> rejectPromoUser(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Principal principal) {
        String reason = body.getOrDefault("reason", "No reason provided");
        java.util.UUID approverId = java.util.UUID.fromString(principal.getName());
        PromoUserResponseDTO response = promoUserService.rejectPromoUser(id, reason, approverId);
        return ResponseEntity.ok(response);
    }

    /**
     * Admin: Get all promo users with filters and pagination
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<PromoUserResponseDTO>> getAllPromoUsers(
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) String promoStatus,
            Pageable pageable) {
        Page<PromoUserResponseDTO> response = promoUserService.getPromoUsersAdmin(approvalStatus, promoStatus, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Customer: Get my promo access
     */
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ORGANIZER')")
    public ResponseEntity<List<PromoUserResponseDTO>> getMyPromoUsers(Principal principal) {
        java.util.UUID profileId = java.util.UUID.fromString(principal.getName());
        List<PromoUserResponseDTO> promoUsers = promoUserService.getCustomerPromoUsers(profileId);
        return ResponseEntity.ok(promoUsers);
    }

    /**
     * Admin: Get promo users expiring soon
     */
    @GetMapping("/expiring-soon")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromoUserResponseDTO>> getExpiringPromoUsers() {
        List<PromoUserResponseDTO> promoUsers = promoUserService.getExpiringPromoUsers();
        return ResponseEntity.ok(promoUsers);
    }
}
