package com.easycart.sme.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class PromoUserRequestDTO {
    @NotNull(message = "profileId is required")
    private UUID profileId;
    
    @NotNull(message = "serviceId is required")
    private UUID serviceId;
    
    @NotNull(message = "planId is required")
    private UUID planId;
    
    @NotNull(message = "startDate is required")
    private Instant startDate;
    
    @NotNull(message = "expiryDate is required")
    private Instant expiryDate;
    
    private String notes;
}
