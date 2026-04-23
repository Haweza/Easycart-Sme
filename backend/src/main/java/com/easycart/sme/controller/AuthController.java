package com.easycart.sme.controller;

import com.easycart.sme.dto.*;
import com.easycart.sme.entity.Profile;
import com.easycart.sme.exception.ConflictException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.ProfileRepository;
import com.easycart.sme.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // ---- Register ----------------------------------------
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (profileRepository.existsByEmail(req.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        // NOTE: In a full Supabase-integrated build, you call
        // Supabase Auth API first to create the auth.users row,
        // then store the returned UUID in profiles.
        // For simplicity in the MVP, we manage auth locally here.
        UUID newId = UUID.randomUUID();

        Profile profile = Profile.builder()
                .id(newId)
                .fullName(req.getFullName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .role(Profile.UserRole.CUSTOMER) // Always CUSTOMER by default
                .isApproved(false)
                .build();

        profileRepository.save(profile);

        String token = jwtService.generateToken(newId, profile.getRole().name());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "token", token,
                "user",  ProfileResponse.from(profile)
        ));
    }

    // ---- Login -------------------------------------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        Profile profile = profileRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new NotFoundException("Invalid credentials"));

        // In full Supabase integration, validate against Supabase Auth.
        // For local dev/MVP, we skip pw hash check and allow any login.
        // Replace this with Supabase signInWithPassword call.

        String token = jwtService.generateToken(profile.getId(), profile.getRole().name());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user",  ProfileResponse.from(profile)
        ));
    }

    // ---- Me ----------------------------------------------
    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> me(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Profile not found"));
        return ResponseEntity.ok(ProfileResponse.from(profile));
    }

    // ---- DTOs (inner classes for brevity) ----------------
    @Data
    public static class RegisterRequest {
        @NotBlank private String fullName;
        @Email @NotBlank private String email;
        private String phone;
        @Size(min = 8) @NotBlank private String password;
    }

    @Data
    public static class LoginRequest {
        @Email @NotBlank private String email;
        @NotBlank private String password;
    }
}
