package com.easycart.sme.config;

import com.easycart.sme.entity.Profile;
import com.easycart.sme.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final ProfileRepository profileRepository;

    @Override
    public void run(String... args) throws Exception {
        // Seed Admin
        if (profileRepository.findByEmail("admin@easycart.com").isEmpty()) {
            profileRepository.save(Profile.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                    .email("admin@easycart.com")
                    .fullName("Platform Administrator")
                    .role(Profile.UserRole.ADMIN)
                    .isApproved(true)
                    .build());
        }

        // Seed Organizer
        if (profileRepository.findByEmail("organizer@easycart.com").isEmpty()) {
            profileRepository.save(Profile.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000002"))
                    .email("organizer@easycart.com")
                    .fullName("Service Organizer")
                    .role(Profile.UserRole.ORGANIZER)
                    .isApproved(true)
                    .build());
        }

        // Seed Customer
        if (profileRepository.findByEmail("customer@easycart.com").isEmpty()) {
            profileRepository.save(Profile.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000003"))
                    .email("customer@easycart.com")
                    .fullName("Platform Customer")
                    .role(Profile.UserRole.CUSTOMER)
                    .isApproved(true)
                    .build());
        }
    }
}
