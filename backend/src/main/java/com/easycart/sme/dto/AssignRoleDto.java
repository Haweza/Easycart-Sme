package com.easycart.sme.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignRoleDto {
    @NotBlank(message = "role is required")
    private String role; // CUSTOMER | ORGANIZER | ADMIN
}
