package com.easycart.sme.dto;

import com.easycart.sme.entity.Subscription;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userEmail;
    private UUID serviceId;
    private String serviceName;
    private UUID planId;
    private String planName;
    private Instant startDate;
    private Instant expiresAt;
    private String status;
    private UUID familyId;
    private String familyName;

    public static SubscriptionResponse from(Subscription sub) {
        if (sub == null) return null;
        return SubscriptionResponse.builder()
                .id(sub.getId())
                .userId(sub.getUser().getId())
                .userName(sub.getUser().getFullName())
                .userEmail(sub.getUser().getEmail())
                .serviceId(sub.getService().getId())
                .serviceName(sub.getService().getName())
                .planId(sub.getPlan() != null ? sub.getPlan().getId() : null)
                .planName(sub.getPlan() != null ? sub.getPlan().getName() : null)
                .startDate(sub.getStartDate())
                .expiresAt(sub.getExpiresAt())
                .status(sub.getStatus().name())
                .familyId(sub.getFamily() != null ? sub.getFamily().getId() : null)
                .familyName(sub.getFamily() != null ? sub.getFamily().getName() : null)
                .build();
    }
}
