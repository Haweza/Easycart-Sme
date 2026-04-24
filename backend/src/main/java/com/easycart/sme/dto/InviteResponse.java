package com.easycart.sme.dto;

import com.easycart.sme.entity.Invite;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class InviteResponse {
    private UUID id;
    private UUID recipientId;
    private String recipientName;
    private UUID familyId;
    private String familyName;
    private UUID planId;
    private String planName;
    private String serviceName;
    private String status;
    private String token;
    private String message;
    private Instant expiresAt;
    private Instant respondedAt;
    private Instant createdAt;

    public static InviteResponse from(Invite i) {
        return InviteResponse.builder()
                .id(i.getId())
                .recipientId(i.getRecipient().getId())
                .recipientName(i.getRecipient().getFullName())
                .familyId(i.getFamily().getId())
                .familyName(i.getFamily().getName())
                .planId(i.getPlan().getId())
                .planName(i.getPlan().getName())
                .serviceName(i.getPlan().getService().getName())
                .status(i.getStatus().name())
                .token(i.getToken())
                .message(i.getMessage())
                .expiresAt(i.getExpiresAt())
                .respondedAt(i.getRespondedAt())
                .createdAt(i.getCreatedAt())
                .build();
    }
}
