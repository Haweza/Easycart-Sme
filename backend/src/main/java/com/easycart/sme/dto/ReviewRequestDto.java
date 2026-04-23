package com.easycart.sme.dto;

import lombok.Data;

@Data
public class ReviewRequestDto {
    private boolean approved;
    private String adminNote;
}
