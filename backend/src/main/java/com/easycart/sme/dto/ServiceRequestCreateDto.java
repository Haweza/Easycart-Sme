package com.easycart.sme.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ServiceRequestCreateDto {
    @NotNull(message = "serviceId is required")
    private UUID serviceId;
    private UUID planId;
    private String message;
}
