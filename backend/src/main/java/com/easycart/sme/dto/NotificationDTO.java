package com.easycart.sme.dto;

import com.easycart.sme.entity.Notification;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class NotificationDTO {
    private UUID id;
    private UUID userId;
    private String title;
    private String message;
    private String type;

    @JsonProperty("isRead")
    private boolean isRead;

    private Instant createdAt;

    public static NotificationDTO from(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType().name())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
