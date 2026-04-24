package com.easycart.sme.repository;

import com.easycart.sme.entity.Invite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InviteRepository extends JpaRepository<Invite, UUID> {

    List<Invite> findByRecipientId(UUID recipientId);

    List<Invite> findByRecipientIdAndStatus(UUID recipientId, Invite.InviteStatus status);

    Optional<Invite> findByToken(String token);

    List<Invite> findByFamilyId(UUID familyId);

    /** Check for existing active (PENDING) invite to prevent duplicates */
    boolean existsByRecipientIdAndFamilyIdAndPlanIdAndStatus(
            UUID recipientId, UUID familyId, UUID planId, Invite.InviteStatus status);

    /** Expire all pending invites past their expiry date (called by scheduler) */
    @Modifying
    @Transactional
    @Query("UPDATE Invite i SET i.status = 'EXPIRED' WHERE i.status = 'PENDING' AND i.expiresAt < :now")
    int expireOldInvites(Instant now);
}
