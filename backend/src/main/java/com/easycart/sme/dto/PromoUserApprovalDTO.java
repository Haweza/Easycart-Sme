package com.easycart.sme.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class PromoUserApprovalDTO {
    @NotNull(message = "promoUserId is required")
    private UUID promoUserId;
    
    @NotNull(message = "approvalAction is required")
    private String approvalAction; // "APPROVE" or "REJECT"
    
    private String rejectionReason;
}
