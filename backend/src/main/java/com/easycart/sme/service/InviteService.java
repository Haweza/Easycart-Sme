package com.easycart.sme.service;

import com.easycart.sme.dto.InviteCreateRequest;
import com.easycart.sme.dto.InviteResponse;
import com.easycart.sme.entity.*;
import com.easycart.sme.exception.BadRequestException;
import com.easycart.sme.exception.ConflictException;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InviteService {

    private final InviteRepository inviteRepository;
    private final ProfileRepository profileRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final com.easycart.sme.repository.ServiceRepository serviceRepository;

    // -------------------------------------------------------
    //  ADMIN: Create invite
    // -------------------------------------------------------

    @Transactional
    public InviteResponse createInvite(InviteCreateRequest request, UUID adminId) {
        Profile admin = profileRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin not found"));
        if (admin.getRole() != Profile.UserRole.ADMIN) {
            throw new ForbiddenException("Only ADMIN can create invites");
        }

        Profile recipient = profileRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new NotFoundException("Recipient user not found"));

        Family family = familyRepository.findById(request.getFamilyId())
                .orElseThrow(() -> new NotFoundException("Family not found"));

        com.easycart.sme.entity.Service service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new NotFoundException("Service not found"));

        // ENFORCEMENT: Check user not already an active member of this family
        if (familyMemberRepository.existsByUserIdAndFamilyIdAndStatus(
                recipient.getId(), family.getId(), FamilyMember.MembershipStatus.ACTIVE)) {
            throw new ConflictException("User is already an active member of this family");
        }

        // ENFORCEMENT: No duplicate PENDING invites
        if (inviteRepository.existsByRecipientIdAndFamilyIdAndServiceIdAndStatus(
                recipient.getId(), family.getId(), service.getId(), Invite.InviteStatus.PENDING)) {
            throw new ConflictException("A pending invite already exists for this user, family, and service");
        }

        // Generate a cryptographically secure token
        String token = generateSecureToken();

        Invite invite = Invite.builder()
                .recipient(recipient)
                .family(family)
                .service(service)
                .createdBy(admin)
                .status(Invite.InviteStatus.PENDING)
                .token(token)
                .message(request.getMessage())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        return InviteResponse.from(inviteRepository.save(invite));
    }

    // -------------------------------------------------------
    //  CUSTOMER: Accept invite
    // -------------------------------------------------------

    @Transactional
    public InviteResponse acceptInvite(UUID inviteId, UUID userId) {
        Invite invite = getInviteForUser(inviteId, userId);
        invite.ensureNotAccepted(); // application-level guard

        if (invite.getStatus() == Invite.InviteStatus.EXPIRED) {
            throw new BadRequestException("This invite has expired");
        }
        if (invite.getStatus() == Invite.InviteStatus.DECLINED) {
            throw new BadRequestException("This invite was already declined");
        }
        if (invite.getExpiresAt().isBefore(Instant.now())) {
            invite.setStatus(Invite.InviteStatus.EXPIRED);
            inviteRepository.save(invite);
            throw new BadRequestException("This invite has expired");
        }

        // Activate membership (DB trigger also does this, this is the app-layer mirror)
        FamilyMember member = FamilyMember.builder()
                .family(invite.getFamily())
                .user(invite.getRecipient())
                .status(FamilyMember.MembershipStatus.ACTIVE)
                .build();
        familyMemberRepository.save(member);

        invite.setStatus(Invite.InviteStatus.ACCEPTED);
        invite.setRespondedAt(Instant.now());
        return InviteResponse.from(inviteRepository.save(invite));
    }

    // -------------------------------------------------------
    //  CUSTOMER: Decline invite
    // -------------------------------------------------------

    @Transactional
    public InviteResponse declineInvite(UUID inviteId, UUID userId) {
        Invite invite = getInviteForUser(inviteId, userId);
        invite.ensureNotAccepted();

        if (invite.getStatus() != Invite.InviteStatus.PENDING) {
            throw new BadRequestException("Only PENDING invites can be declined");
        }

        invite.setStatus(Invite.InviteStatus.DECLINED);
        invite.setRespondedAt(Instant.now());
        return InviteResponse.from(inviteRepository.save(invite));
    }

    // -------------------------------------------------------
    //  CUSTOMER: Get own invites
    // -------------------------------------------------------

    public List<InviteResponse> getMyInvites(UUID userId) {
        return inviteRepository.findByRecipientId(userId)
                .stream()
                .map(InviteResponse::from)
                .toList();
    }

    // -------------------------------------------------------
    //  ADMIN: Get all invites
    // -------------------------------------------------------

    public List<InviteResponse> getAllInvites() {
        return inviteRepository.findAll()
                .stream()
                .map(InviteResponse::from)
                .toList();
    }

    // -------------------------------------------------------
    //  SCHEDULER: Auto-expire pending invites
    // -------------------------------------------------------

    @Scheduled(cron = "0 0 * * * *") // Every hour
    @Transactional
    public void expireStaleInvites() {
        int expired = inviteRepository.expireOldInvites(Instant.now());
        if (expired > 0) {
            System.out.printf("[InviteService] Auto-expired %d stale invites%n", expired);
        }
    }

    // -------------------------------------------------------
    //  HELPERS
    // -------------------------------------------------------

    private Invite getInviteForUser(UUID inviteId, UUID userId) {
        Invite invite = inviteRepository.findById(inviteId)
                .orElseThrow(() -> new NotFoundException("Invite not found"));
        if (!invite.getRecipient().getId().equals(userId)) {
            throw new ForbiddenException("You are not the recipient of this invite");
        }
        return invite;
    }

    private String generateSecureToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
