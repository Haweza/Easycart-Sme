package com.easycart.sme.controller;

import com.easycart.sme.dto.*;
import com.easycart.sme.entity.Notification;
import com.easycart.sme.entity.Profile;
import com.easycart.sme.entity.ActivityLog;
import com.easycart.sme.exception.ConflictException;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.ProfileRepository;
import com.easycart.sme.repository.FamilyRepository;
import com.easycart.sme.repository.ActivityLogRepository;
import com.easycart.sme.entity.Family;
import com.easycart.sme.service.NotificationService;
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
    private final com.easycart.sme.repository.ServiceRequestRepository serviceRequestRepository;
    private final com.easycart.sme.repository.SubscriptionRepository subscriptionRepository;
    private final com.easycart.sme.repository.ServiceRepository serviceRepository;
    private final NotificationService notificationService;

    /** GET /api/admin/activities — list all activity logs for the notice feed */
    @GetMapping("/activities")
    public ResponseEntity<List<ActivityLog>> getActivityLogs() {
        List<ActivityLog> logs = new java.util.ArrayList<>(activityLogRepository.findAllByOrderByCreatedAtDesc());
        
        // Find subscriptions expiring in 7 days
        java.time.Instant now = java.time.Instant.now();
        java.time.Instant next7Days = now.plus(java.time.Duration.ofDays(7));
        
        List<com.easycart.sme.entity.Subscription> expiringSubs = subscriptionRepository.findAll().stream()
                .filter(s -> s.getStatus() == com.easycart.sme.entity.Subscription.SubscriptionStatus.ACTIVE 
                        && s.getExpiresAt() != null 
                        && s.getExpiresAt().isAfter(now) 
                        && s.getExpiresAt().isBefore(next7Days))
                .toList();
                
        for (com.easycart.sme.entity.Subscription s : expiringSubs) {
            long daysLeft = java.time.Duration.between(now, s.getExpiresAt()).toDays() + 1;
            logs.add(ActivityLog.builder()
                    .id(UUID.randomUUID()) // transient id
                    .actorId(s.getUser().getId())
                    .actorName("SYSTEM")
                    .action("EXPIRING_SOON")
                    .description(String.format("Individual subscription for %s (%s - %s) is expiring in %d days!", 
                            s.getUser().getFullName(), 
                            s.getService().getName(), 
                            s.getPlan() != null ? s.getPlan().getName() : "plan",
                            daysLeft))
                    .createdAt(s.getExpiresAt().minus(java.time.Duration.ofDays(7))) // show it starting from 7 days before
                    .build());
        }
        
        // Sort all by createdAt desc
        logs.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        
        return ResponseEntity.ok(logs);
    }

    /** DELETE /api/admin/activities/{id} — delete an activity log entry */
    @DeleteMapping("/activities/{id}")
    public ResponseEntity<Void> deleteActivityLog(@PathVariable UUID id) {
        if (activityLogRepository.existsById(id)) {
            activityLogRepository.deleteById(id);
        }
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/admin/activities — delete all activity logs */
    @DeleteMapping("/activities")
    public ResponseEntity<Void> deleteAllActivityLogs() {
        activityLogRepository.deleteAll();
        return ResponseEntity.noContent().build();
    }

    /** GET /api/admin/subscriptions — list all active individual subscriptions */
    @GetMapping("/subscriptions")
    public ResponseEntity<List<com.easycart.sme.dto.SubscriptionResponse>> getAllSubscriptions() {
        return ResponseEntity.ok(subscriptionRepository.findAll().stream()
                .map(com.easycart.sme.dto.SubscriptionResponse::from)
                .toList());
    }

    /** DELETE /api/admin/subscriptions/{id} — delete a subscription */
    @DeleteMapping("/subscriptions/{id}")
    public ResponseEntity<Void> deleteSubscription(
            @PathVariable UUID id,
            java.security.Principal principal) {
        com.easycart.sme.entity.Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Subscription not found"));

        UUID adminId = UUID.fromString(principal.getName());
        Profile admin = profileRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin not found"));

        // Log the deletion
        activityLogRepository.save(ActivityLog.builder()
                .actorId(adminId)
                .actorName(admin.getFullName())
                .action("SUBSCRIPTION_DELETED")
                .description(String.format("Deleted subscription for %s - Service: %s, Plan: %s",
                        subscription.getUser().getFullName(),
                        subscription.getService().getName(),
                        subscription.getPlan() != null ? subscription.getPlan().getName() : "N/A"))
                .build());

        subscriptionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
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
        Profile saved = profileRepository.save(user);

        // Notify the user their account has been approved
        notificationService.createNotification(
                saved.getId(),
                "Account Approved ✅",
                "Your EasyCart SME account has been approved. You can now browse and request services.",
                Notification.NotificationType.ACCOUNT_APPROVED
        );

        return ResponseEntity.ok(ProfileResponse.from(saved));
    }

    // --- Families ---

    /** POST /api/admin/families — create a new family */
    @PostMapping("/families")
    public ResponseEntity<FamilyResponse> createFamily(
            @Valid @RequestBody CreateFamilyDto dto,
            java.security.Principal principal) {
        if (familyRepository.existsByName(dto.getName())) {
            throw new ConflictException("A family with this name already exists");
        }

        UUID adminId = UUID.fromString(principal.getName());
        Profile admin = profileRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin not found"));
        
        com.easycart.sme.entity.Service service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new NotFoundException("Service not found"));

        if (service.getIsFamilyType() == null || !service.getIsFamilyType()) {
            throw new com.easycart.sme.exception.BadRequestException("Family creation is only allowed for family-supported services");
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
            if (!plan.getService().getId().equals(service.getId())) {
                throw new com.easycart.sme.exception.BadRequestException("The selected plan does not belong to the chosen service");
            }
        }
        
        Family family = Family.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .organizer(organizer)
                .service(service)
                .plan(plan)
                .maxMembers(dto.getMaxMembers() != null ? dto.getMaxMembers() : 10)
                .startDate(dto.getStartDate())
                .expiresAt(dto.getExpiresAt())
                .build();

        Family savedFamily = familyRepository.save(family);

        // Save activity log for family creation
        activityLogRepository.save(ActivityLog.builder()
                .actorId(adminId)
                .actorName(admin.getFullName())
                .action("FAMILY_CREATED")
                .description(String.format("Created family %s for service %s", savedFamily.getName(), service.getName()))
                .familyId(savedFamily.getId())
                .build());

        return ResponseEntity.ok(FamilyResponse.from(savedFamily));
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
            @RequestBody java.util.Map<String, UUID> payload,
            java.security.Principal principal) {
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

        // Prevent adding a user to a family whose service does not match the user's requested/approved service.
        boolean hasServiceAccess = serviceRequestRepository.existsByUserIdAndServiceIdAndStatus(
                userId, family.getService().getId(), com.easycart.sme.entity.ServiceRequest.RequestStatus.APPROVED);
        if (!hasServiceAccess) {
            throw new com.easycart.sme.exception.BadRequestException("User has not been approved for this family's service");
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

        // Audit log adding member
        UUID actorId = UUID.fromString(principal.getName());
        var actorProfile = profileRepository.findById(actorId)
                .orElseThrow(() -> new NotFoundException("Admin profile not found"));

        activityLogRepository.save(ActivityLog.builder()
                .actorId(actorId)
                .actorName(actorProfile.getFullName())
                .action("ADD_MEMBER")
                .description(String.format("Added %s to family %s", user.getFullName(), family.getName()))
                .familyId(id)
                .build());

        return ResponseEntity.ok().build();
    }
}
