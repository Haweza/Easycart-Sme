package com.easycart.sme.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class InviteCreateRequest {
    @NotNull(message = "recipientId is required")
    private UUID recipientId;
    @NotNull(message = "familyId is required")
    private UUID familyId;
    @NotNull(message = "serviceId is required")
    private UUID serviceId;
    private String message;
}
