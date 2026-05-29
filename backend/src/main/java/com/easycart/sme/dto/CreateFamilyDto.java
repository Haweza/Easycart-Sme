package com.easycart.sme.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class CreateFamilyDto {
    @NotBlank(message = "name is required")
    private String name;
    private String description;
    private UUID organizerId;

    @NotNull(message = "serviceId is required")
    private UUID serviceId;

    private UUID planId;
    private Integer maxMembers;
    private Instant startDate;
    private Instant expiresAt;
}
