package com.easycart.sme.dto;

import com.easycart.sme.entity.Family;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FamilyResponse {
    private UUID id;
    private String name;
    private String description;
    private UUID organizerId;
    private String organizerName;
    private Integer maxMembers;
    private Boolean isActive;
    private UUID planId;
    private String planName;
    private UUID serviceId;
    private String serviceName;
    private Instant startDate;
    private Instant expiresAt;
    private Instant createdAt;

    public static FamilyResponse from(Family f) {
        return FamilyResponse.builder()
                .id(f.getId())
                .name(f.getName())
                .description(f.getDescription())
                .organizerId(f.getOrganizer() != null ? f.getOrganizer().getId() : null)
                .organizerName(f.getOrganizer() != null ? f.getOrganizer().getFullName() : null)
                .maxMembers(f.getMaxMembers())
                .isActive(f.getIsActive())
                .planId(f.getPlan() != null ? f.getPlan().getId() : null)
                .planName(f.getPlan() != null ? f.getPlan().getName() : null)
                .serviceId(f.getService() != null ? f.getService().getId() : null)
                .serviceName(f.getService() != null ? f.getService().getName() : null)
                .startDate(f.getStartDate())
                .expiresAt(f.getExpiresAt())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
