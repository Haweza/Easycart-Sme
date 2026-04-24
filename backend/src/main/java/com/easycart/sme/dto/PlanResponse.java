package com.easycart.sme.dto;

import com.easycart.sme.entity.Plan;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class PlanResponse {
    private UUID id;
    private String name;
    private BigDecimal price;
    private String currency;
    private boolean isActive;

    public static PlanResponse from(Plan p) {
        return PlanResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .price(p.getPrice())
                .currency(p.getCurrency())
                .isActive(p.getIsActive())
                .build();
    }
}
