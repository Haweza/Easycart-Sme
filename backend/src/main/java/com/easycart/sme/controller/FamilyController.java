package com.easycart.sme.controller;

import com.easycart.sme.dto.FamilyResponse;
import com.easycart.sme.entity.Family;
import com.easycart.sme.entity.FamilyMember;
import com.easycart.sme.entity.ActivityLog;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.FamilyMemberRepository;
import com.easycart.sme.repository.FamilyRepository;
import com.easycart.sme.repository.ProfileRepository;
import com.easycart.sme.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/families")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final ProfileRepository profileRepository;
    private final ActivityLogRepository activityLogRepository;

    /**
     * GET /api/families
     * ORGANIZER: returns their assigned families.
     * ADMIN: returns all families.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','ORGANIZER')")
    public ResponseEntity<List<FamilyResponse>> getMyFamilies(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        var profile = profileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Profile not found"));

        List<Family> families;
        if (profile.getRole().name().equals("ADMIN")) {
            families = familyRepository.findAll();
        } else {
            families = familyRepository.findByOrganizerId(userId);
        }
        return ResponseEntity.ok(families.stream().map(FamilyResponse::from).toList());
    }

    /**
     * GET /api/families/{id}/members
     * ORGANIZER can only view members of their own families.
     * ADMIN can view any.
     */
    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN','ORGANIZER')")
    public ResponseEntity<List<Map<String, Object>>> getMembers(
            @PathVariable UUID id,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        var profile = profileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Profile not found"));

        Family family = familyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Family not found"));

        // ORGANIZER scope check
        if (profile.getRole().name().equals("ORGANIZER")) {
            if (family.getOrganizer() == null || !family.getOrganizer().getId().equals(userId)) {
                throw new ForbiddenException("You can only view members of your assigned families");
            }
        }

        List<FamilyMember> members = familyMemberRepository.findByFamilyId(id);
        List<Map<String, Object>> result = members.stream().map(m -> Map.<String, Object>of(
                "id",       m.getId().toString(),
                "userId",   m.getUser().getId().toString(),
                "familyId", m.getFamily().getId().toString(),
                "status",   m.getStatus().name(),
                "joinedAt", m.getJoinedAt().toString(),
                "user",     Map.of(
                    "fullName", m.getUser().getFullName(),
                    "email",    m.getUser().getEmail()
                )
        )).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/families/{familyId}/members/{userId}
     * ORGANIZER: can only remove members from their assigned families.
     * ADMIN: can remove members from any family.
     */
    @DeleteMapping("/{familyId}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','ORGANIZER')")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID familyId,
            @PathVariable UUID userId,
            Principal principal) {

        UUID actorId = UUID.fromString(principal.getName());
        var actorProfile = profileRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Actor profile not found"));

        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new NotFoundException("Family not found"));

        // ORGANIZER scope check
        if (actorProfile.getRole().name().equals("ORGANIZER")) {
            if (family.getOrganizer() == null || !family.getOrganizer().getId().equals(actorId)) {
                throw new ForbiddenException("You can only remove members from your assigned families");
            }
        }

        // Find the active member
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new NotFoundException("Active family membership not found for this user"));

        // Delete the member record
        familyMemberRepository.delete(member);

        // Save activity log for organizers and admins alike
        activityLogRepository.save(ActivityLog.builder()
                .actorId(actorId)
                .actorName(actorProfile.getFullName())
                .action("REMOVE_MEMBER")
                .description(String.format("Removed %s from family %s", member.getUser().getFullName(), family.getName()))
                .familyId(familyId)
                .build());

        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/families/activities
     * Returns activities for families assigned to this organizer.
     */
    @GetMapping("/activities")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<List<ActivityLog>> getOrganizerActivities(Principal principal) {
        UUID organizerId = UUID.fromString(principal.getName());
        List<Family> families = familyRepository.findByOrganizerId(organizerId);
        List<UUID> familyIds = families.stream().map(Family::getId).toList();
        
        if (familyIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        
        // Find logs where familyId is in organizer's families
        List<ActivityLog> logs = activityLogRepository.findByFamilyIdInOrderByCreatedAtDesc(familyIds);
        return ResponseEntity.ok(logs);
    }
}
