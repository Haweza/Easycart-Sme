package com.easycart.sme.dto;

import com.easycart.sme.entity.Profile;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ProfileResponse {
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private boolean isApproved;
    private String avatarUrl;
    private Instant createdAt;

    public static ProfileResponse from(Profile p) {
        return ProfileResponse.builder()
                .id(p.getId())
                .fullName(p.getFullName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .role(p.getRole().name())
                .isApproved(Boolean.TRUE.equals(p.getIsApproved()))
                .avatarUrl(p.getAvatarUrl())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
