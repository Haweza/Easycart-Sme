package com.easycart.sme.service;

import com.easycart.sme.dto.PromoUserRequestDTO;
import com.easycart.sme.dto.PromoUserResponseDTO;
import com.easycart.sme.entity.*;
import com.easycart.sme.exception.ConflictException;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromoUserService {
    
    private final PromoUserRepository promoUserRepository;
    private final ProfileRepository profileRepository;
    private final ServiceRepository serviceRepository;
    private final PlanRepository planRepository;
    private final ActivityLogService activityLogService;

    /**
     * Create a new promo user (defaults to PENDING status)
     */
    @Transactional
    public PromoUserResponseDTO createPromoUser(PromoUserRequestDTO request, UUID creatorId) {
        Profile creator = profileRepository.findById(creatorId)
                .orElseThrow(() -> new NotFoundException("Creator not found"));
        
        if (creator.getRole() != Profile.UserRole.ADMIN) {
            throw new ForbiddenException("Only ADMIN can create promo users");
        }

        Profile profile = profileRepository.findById(request.getProfileId())
                .orElseThrow(() -> new NotFoundException("User profile not found"));

       com.easycart.sme.entity.Service service =
        serviceRepository.findById(request.getServiceId())
        .orElseThrow(() -> new NotFoundException("Service not found"));

        Plan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new NotFoundException("Plan not found"));

        // Check for duplicates
        if (promoUserRepository.existsByProfileIdAndServiceIdAndStatus(
                profile.getId(), service.getId(), PromoUser.PromoStatus.ACTIVE)) {
            throw new ConflictException("User already has an active promo for this service");
        }

        PromoUser promoUser = PromoUser.builder()
                .profile(profile)
                .service(service)
                .plan(plan)
                .startDate(request.getStartDate())
                .expiryDate(request.getExpiryDate())
                .status(PromoUser.PromoStatus.PENDING)
                .approvalStatus(PromoUser.ApprovalStatus.PENDING)
                .notes(request.getNotes())
                .build();

        PromoUser saved = promoUserRepository.save(promoUser);

        // Log activity
        activityLogService.logActivity(
                creator.getFullName(),
                "PROMO_USER_CREATED",
                "Created promo access for " + profile.getFullName() + " - Service: " + service.getName(),
                saved.getId().toString()
        );

        return PromoUserResponseDTO.from(saved);
    }

    /**
     * Get pending promo users for admin review
     */
    @Transactional(readOnly = true)
    public List<PromoUserResponseDTO> getPendingPromoUsers() {
        return promoUserRepository.findByApprovalStatusOrderByCreatedAtDesc(PromoUser.ApprovalStatus.PENDING)
                .stream()
                .map(PromoUserResponseDTO::from)
                .collect(Collectors.toList());
    }

    /**
     * Approve promo user access
     */
    @Transactional
    public PromoUserResponseDTO approvePromoUser(String promoUserId, UUID approverUUID) {
        Profile approver = profileRepository.findById(approverUUID)
                .orElseThrow(() -> new NotFoundException("Approver not found"));
        
        if (approver.getRole() != Profile.UserRole.ADMIN) {
            throw new ForbiddenException("Only ADMIN can approve promo users");
        }

        PromoUser promoUser = promoUserRepository.findById(java.util.UUID.fromString(promoUserId))
                .orElseThrow(() -> new NotFoundException("Promo user not found"));

        promoUser.setApprovalStatus(PromoUser.ApprovalStatus.APPROVED);
        promoUser.setStatus(PromoUser.PromoStatus.ACTIVE);
        promoUser.setApprovedBy(approver);
        promoUser.setApprovedAt(Instant.now());

        PromoUser saved = promoUserRepository.save(promoUser);

        // Log activity
        activityLogService.logActivity(
                approver.getFullName(),
                "PROMO_USER_APPROVED",
                "Approved promo access for " + promoUser.getProfile().getFullName(),
                saved.getId().toString()
        );

        return PromoUserResponseDTO.from(saved);
    }

    /**
     * Reject promo user access
     */
    @Transactional
    public PromoUserResponseDTO rejectPromoUser(String promoUserId, String reason, UUID approverUUID) {
        Profile approver = profileRepository.findById(approverUUID)
                .orElseThrow(() -> new NotFoundException("Approver not found"));
        
        if (approver.getRole() != Profile.UserRole.ADMIN) {
            throw new ForbiddenException("Only ADMIN can reject promo users");
        }

        PromoUser promoUser = promoUserRepository.findById(java.util.UUID.fromString(promoUserId))
                .orElseThrow(() -> new NotFoundException("Promo user not found"));

        promoUser.setApprovalStatus(PromoUser.ApprovalStatus.REJECTED);
        promoUser.setNotes((promoUser.getNotes() != null ? promoUser.getNotes() + " | " : "") + 
                           "Rejected: " + (reason != null ? reason : "No reason provided"));

        PromoUser saved = promoUserRepository.save(promoUser);

        // Log activity
        activityLogService.logActivity(
                approver.getFullName(),
                "PROMO_USER_REJECTED",
                "Rejected promo access for " + promoUser.getProfile().getFullName() + 
                " - Reason: " + (reason != null ? reason : "N/A"),
                saved.getId().toString()
        );

        return PromoUserResponseDTO.from(saved);
    }

    /**
     * Get all promo users for a specific customer
     */
    @Transactional(readOnly = true)
    public List<PromoUserResponseDTO> getCustomerPromoUsers(UUID profileId) {
        return promoUserRepository.findByProfileId(profileId)
                .stream()
                .map(PromoUserResponseDTO::from)
                .collect(Collectors.toList());
    }

    /**
     * Get all promo users (admin view with pagination)
     */
    @Transactional(readOnly = true)
    public Page<PromoUserResponseDTO> getPromoUsersAdmin(
            String approvalStatus,
            String promoStatus,
            Pageable pageable) {
        
        if (approvalStatus != null && !approvalStatus.isEmpty()) {
            try {
                PromoUser.ApprovalStatus status = PromoUser.ApprovalStatus.valueOf(approvalStatus);
                return promoUserRepository.findByApprovalStatus(status, pageable)
                        .map(PromoUserResponseDTO::from);
            } catch (IllegalArgumentException e) {
                throw new NotFoundException("Invalid approval status: " + approvalStatus);
            }
        }

        return promoUserRepository.findAll(pageable)
                .map(PromoUserResponseDTO::from);
    }

    /**
     * Auto-expire promo users (scheduled task - runs every hour)
     */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void expirePromoUsers() {
        Instant now = Instant.now();
        
        // Find all ACTIVE promo users past their expiry date
        List<PromoUser> expiredUsers = promoUserRepository.findByStatusAndExpiryDateBefore(
                PromoUser.PromoStatus.ACTIVE,
                now
        );

        for (PromoUser promoUser : expiredUsers) {
            promoUser.setStatus(PromoUser.PromoStatus.EXPIRED);
            promoUserRepository.save(promoUser);

            // Log activity
            activityLogService.logActivity(
                    "SYSTEM",
                    "PROMO_USER_EXPIRED",
                    "Promo access expired for " + promoUser.getProfile().getFullName(),
                    promoUser.getId().toString()
            );
        }
    }

    /**
     * Get promo users expiring soon (within 7 days)
     */
    @Transactional(readOnly = true)
    public List<PromoUserResponseDTO> getExpiringPromoUsers() {
        Instant now = Instant.now();
        Instant sevenDaysFromNow = now.plusSeconds(7 * 24 * 60 * 60);

        return promoUserRepository.findByExpiryDateBetweenAndStatus(
                now,
                sevenDaysFromNow,
                PromoUser.PromoStatus.ACTIVE
        ).stream()
                .map(PromoUserResponseDTO::from)
                .collect(Collectors.toList());
    }
}
