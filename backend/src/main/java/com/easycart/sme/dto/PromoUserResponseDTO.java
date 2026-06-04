package com.easycart.sme.dto;

import com.easycart.sme.entity.PromoUser;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromoUserResponseDTO {
    private UUID id;
    private UUID profileId;
    private String profileName;
    private String profileEmail;
    private UUID serviceId;
    private String serviceName;
    private UUID planId;
    private String planName;
    private Instant startDate;
    private Instant expiryDate;
    private String status;
    private String approvalStatus;
    private String notes;
    private UUID approvedBy;
    private String approvedByName;
    private Instant approvedAt;
    private Instant createdAt;
    private Instant updatedAt;

    /**
     * Factory method to convert PromoUser entity to DTO
     */
    public static PromoUserResponseDTO from(PromoUser promo) {
        if (promo == null) return null;
        
        return PromoUserResponseDTO.builder()
                .id(promo.getId())
                .profileId(promo.getProfile().getId())
                .profileName(promo.getProfile().getFullName())
                .profileEmail(promo.getProfile().getEmail())
                .serviceId(promo.getService().getId())
                .serviceName(promo.getService().getName())
                .planId(promo.getPlan().getId())
                .planName(promo.getPlan().getName())
                .startDate(promo.getStartDate())
                .expiryDate(promo.getExpiryDate())
                .status(promo.getStatus().name())
                .approvalStatus(promo.getApprovalStatus().name())
                .notes(promo.getNotes())
                .approvedBy(promo.getApprovedBy() != null ? promo.getApprovedBy().getId() : null)
                .approvedByName(promo.getApprovedBy() != null ? promo.getApprovedBy().getFullName() : null)
                .approvedAt(promo.getApprovedAt())
                .createdAt(promo.getCreatedAt())
                .updatedAt(promo.getUpdatedAt())
                .build();
    }
}
