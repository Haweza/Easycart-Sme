package com.easycart.sme.controller;

import com.easycart.sme.dto.*;
import com.easycart.sme.entity.Profile;
import com.easycart.sme.entity.ActivityLog;
import com.easycart.sme.exception.ConflictException;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.ProfileRepository;
import com.easycart.sme.repository.FamilyRepository;
import com.easycart.sme.repository.ActivityLogRepository;
import com.easycart.sme.entity.Family;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final ProfileRepository profileRepository;
    private final FamilyRepository familyRepository;
    private final com.easycart.sme.repository.FamilyMemberRepository familyMemberRepository;
    private final com.easycart.sme.repository.PlanRepository planRepository;
    private final ActivityLogRepository activityLogRepository;

    /** GET /api/admin/activities — list all activity logs for the notice feed */
    @GetMapping("/activities")
    public ResponseEntity<List<ActivityLog>> getActivityLogs() {
        return ResponseEntity.ok(activityLogRepository.findAllByOrderByCreatedAtDesc());
    }

    // --- Users ---

    /** GET /api/admin/users — list all users */
    @GetMapping("/users")
    public ResponseEntity<List<ProfileResponse>> getAllUsers() {
        List<ProfileResponse> users = profileRepository.findAll()
                .stream()
                .map(ProfileResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    /** PUT /api/admin/users/{id}/role — assign role */
    @PutMapping("/users/{id}/role")
    public ResponseEntity<ProfileResponse> assignRole(
            @PathVariable UUID id,
            @Valid @RequestBody AssignRoleDto dto) {
        Profile user = profileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setRole(Profile.UserRole.valueOf(dto.getRole().toUpperCase()));
        return ResponseEntity.ok(ProfileResponse.from(profileRepository.save(user)));
    }

    /** PUT /api/admin/users/{id}/approve — approve a user */
    @PutMapping("/users/{id}/approve")
    public ResponseEntity<ProfileResponse> approveUser(@PathVariable UUID id) {
        Profile user = profileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setIsApproved(true);
        return ResponseEntity.ok(ProfileResponse.from(profileRepository.save(user)));
    }

    // --- Families ---

    /** POST /api/admin/families — create a new family */
    @PostMapping("/families")
    public ResponseEntity<FamilyResponse> createFamily(@Valid @RequestBody CreateFamilyDto dto) {
        if (familyRepository.existsByName(dto.getName())) {
            throw new ConflictException("A family with this name already exists");
        }
        Profile organizer = null;
        if (dto.getOrganizerId() != null) {
            organizer = profileRepository.findById(dto.getOrganizerId())
                    .orElseThrow(() -> new NotFoundException("Organizer not found"));
            if (organizer.getRole() != Profile.UserRole.ORGANIZER && 
                organizer.getRole() != Profile.UserRole.ADMIN) {
                throw new ForbiddenException("Assigned user is not an ORGANIZER");
            }
        }
        com.easycart.sme.entity.Plan plan = null;
        if (dto.getPlanId() != null) {
            plan = planRepository.findById(dto.getPlanId())
                    .orElseThrow(() -> new NotFoundException("Plan not found"));
        }
        Family family = Family.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .organizer(organizer)
                .plan(plan)
                .maxMembers(dto.getMaxMembers() != null ? dto.getMaxMembers() : 10)
                .startDate(dto.getStartDate())
                .expiresAt(dto.getExpiresAt())
                .build();
        return ResponseEntity.ok(FamilyResponse.from(familyRepository.save(family)));
    }

    /** GET /api/admin/families — list all families */
    @GetMapping("/families")
    public ResponseEntity<List<FamilyResponse>> getAllFamilies() {
        return ResponseEntity.ok(
                familyRepository.findAll().stream().map(FamilyResponse::from).toList()
        );
    }

    /** PUT /api/admin/families/{id}/organizer — assign organizer to family */
    @PutMapping("/families/{id}/organizer")
    public ResponseEntity<FamilyResponse> assignOrganizer(
            @PathVariable UUID id,
            @RequestBody AssignOrganizerDto dto) {
        Family family = familyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Family not found"));
        Profile organizer = profileRepository.findById(dto.getOrganizerId())
                .orElseThrow(() -> new NotFoundException("Organizer not found"));
        if (organizer.getRole() != Profile.UserRole.ORGANIZER) {
            throw new ForbiddenException("User is not an ORGANIZER");
        }
    family.setOrganizer(organizer);
        return ResponseEntity.ok(FamilyResponse.from(familyRepository.save(family)));
    }

    /** POST /api/admin/families/{id}/members — Add member to family */
    @PostMapping("/families/{id}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, UUID> payload) {
        UUID userId = payload.get("userId");
        if (userId == null) {
            throw new com.easycart.sme.exception.BadRequestException("userId is required");
        }

        Family family = familyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Family not found"));

        Profile user = profileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (user.getRole() != Profile.UserRole.CUSTOMER) {
            throw new com.easycart.sme.exception.BadRequestException("User is not a CUSTOMER");
        }
        if (!user.getIsApproved()) {
            throw new com.easycart.sme.exception.BadRequestException("User is not approved");
        }

        if (familyMemberRepository.existsByUserIdAndFamilyIdAndStatus(
                userId, id, com.easycart.sme.entity.FamilyMember.MembershipStatus.ACTIVE)) {
            throw new ConflictException("User is already an active member of this family");
        }

        long activeCount = familyMemberRepository.findByFamilyId(id)
                .stream()
                .filter(m -> m.getStatus() == com.easycart.sme.entity.FamilyMember.MembershipStatus.ACTIVE)
                .count();

        if (activeCount >= family.getMaxMembers()) {
            throw new com.easycart.sme.exception.BadRequestException("Family has reached maximum members limit");
        }

        com.easycart.sme.entity.FamilyMember member = com.easycart.sme.entity.FamilyMember.builder()
                .family(family)
                .user(user)
                .status(com.easycart.sme.entity.FamilyMember.MembershipStatus.ACTIVE)
                .build();
        familyMemberRepository.save(member);

        return ResponseEntity.ok().build();
    }
}
