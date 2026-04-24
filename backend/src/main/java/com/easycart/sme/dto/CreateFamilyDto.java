package com.easycart.sme.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateFamilyDto {
    @NotBlank(message = "name is required")
    private String name;
    private String description;
    private UUID organizerId;
    private UUID planId;
    private Integer maxMembers;
}
