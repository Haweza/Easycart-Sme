package com.easycart.sme.dto;

import com.easycart.sme.entity.ServiceRequest;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ServiceRequestResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private UUID serviceId;
    private String serviceName;
    private UUID planId;
    private String planName;
    private String status;
    private String message;
    private String adminNote;
    private UUID reviewedBy;
    private Instant reviewedAt;
    private Instant createdAt;

    public static ServiceRequestResponse from(ServiceRequest r) {
        return ServiceRequestResponse.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .userName(r.getUser().getFullName())
                .serviceId(r.getService().getId())
                .serviceName(r.getService().getName())
                .planId(r.getPlan() != null ? r.getPlan().getId() : null)
                .planName(r.getPlan() != null ? r.getPlan().getName() : null)
                .status(r.getStatus().name())
                .message(r.getMessage())
                .adminNote(r.getAdminNote())
                .reviewedBy(r.getReviewedBy() != null ? r.getReviewedBy().getId() : null)
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
