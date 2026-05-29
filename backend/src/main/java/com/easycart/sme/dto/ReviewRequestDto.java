package com.easycart.sme.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class ReviewRequestDto {
    private boolean approved;
    private String adminNote;
    private Instant startDate;
    private Instant expiresAt;
}
