package com.easycart.sme.controller;

import com.easycart.sme.dto.SubscriptionResponse;
import com.easycart.sme.entity.FamilyMember;
import com.easycart.sme.entity.PromoUser;
import com.easycart.sme.entity.Subscription;
import com.easycart.sme.repository.FamilyMemberRepository;
import com.easycart.sme.repository.PromoUserRepository;
import com.easycart.sme.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * SubscriptionController — Customer-facing subscription endpoints.
 * Admin-facing endpoints (list all, delete) live in AdminController.
 */
@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PromoUserRepository promoUserRepository;

    /**
     * GET /api/subscriptions/my
     * Returns all subscriptions belonging to the currently authenticated user.
     * Includes individual subscriptions, family memberships, and promo accesses.
     */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SubscriptionResponse>> getMySubscriptions(Principal principal) {
        UUID profileId = UUID.fromString(principal.getName());
        List<SubscriptionResponse> allAccesses = new ArrayList<>();

        // 1. Individual Subscriptions
        List<Subscription> subs = subscriptionRepository.findByUserId(profileId);
        for (Subscription sub : subs) {
            allAccesses.add(SubscriptionResponse.from(sub));
        }

        // 2. Family Memberships
        List<FamilyMember> familyMembers = familyMemberRepository.findByUserId(profileId);
        for (FamilyMember fm : familyMembers) {
            // Only show ACTIVE or SUSPENDED (not INACTIVE/rejected)
            if (fm.getStatus() != FamilyMember.MembershipStatus.INACTIVE) {
                allAccesses.add(SubscriptionResponse.builder()
                        .id(fm.getId())
                        .userId(fm.getUser().getId())
                        .userName(fm.getUser().getFullName())
                        .userEmail(fm.getUser().getEmail())
                        .serviceId(fm.getFamily().getService().getId())
                        .serviceName(fm.getFamily().getService().getName())
                        .planId(fm.getFamily().getPlan() != null ? fm.getFamily().getPlan().getId() : null)
                        .planName(fm.getFamily().getPlan() != null ? fm.getFamily().getPlan().getName() : null)
                        .startDate(fm.getJoinedAt())
                        .expiresAt(fm.getFamily().getExpiresAt())
                        .status(fm.getStatus().name())
                        .familyId(fm.getFamily().getId())
                        .familyName(fm.getFamily().getName())
                        .build());
            }
        }

        // 3. Promo Accesses
        List<PromoUser> promoUsers = promoUserRepository.findByProfileId(profileId);
        for (PromoUser pu : promoUsers) {
            if (pu.getStatus() != PromoUser.PromoStatus.PENDING) { // Only show active/expired/suspended promos as subscriptions
                allAccesses.add(SubscriptionResponse.builder()
                        .id(pu.getId())
                        .userId(pu.getProfile().getId())
                        .userName(pu.getProfile().getFullName())
                        .userEmail(pu.getProfile().getEmail())
                        .serviceId(pu.getService().getId())
                        .serviceName(pu.getService().getName())
                        .planId(pu.getPlan().getId())
                        .planName(pu.getPlan().getName())
                        .startDate(pu.getStartDate())
                        .expiresAt(pu.getExpiryDate())
                        .status(pu.getStatus().name())
                        .familyName("Promo Access")
                        .build());
            }
        }

        return ResponseEntity.ok(allAccesses);
    }
}
