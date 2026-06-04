package com.easycart.sme.repository;

import com.easycart.sme.entity.PromoUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromoUserRepository extends JpaRepository<PromoUser, UUID> {
    
    // Find promo users by profile
    List<PromoUser> findByProfileId(UUID profileId);
    
    // Find promo users by service
    List<PromoUser> findByServiceId(UUID serviceId);
    
    // Find by approval status
    List<PromoUser> findByApprovalStatus(PromoUser.ApprovalStatus approvalStatus);
    
    // Find by promo status
    List<PromoUser> findByStatus(PromoUser.PromoStatus status);
    
    // Find pending promo users (for admin review)
    List<PromoUser> findByApprovalStatusOrderByCreatedAtDesc(PromoUser.ApprovalStatus approvalStatus);
    
    // Paginated queries for admin
    Page<PromoUser> findByApprovalStatus(PromoUser.ApprovalStatus approvalStatus, Pageable pageable);
    
    Page<PromoUser> findByStatusAndApprovalStatus(
        PromoUser.PromoStatus status,
        PromoUser.ApprovalStatus approvalStatus,
        Pageable pageable
    );
    
    // Find promo users expiring within date range
    List<PromoUser> findByExpiryDateBetweenAndStatus(
        Instant startDate,
        Instant endDate,
        PromoUser.PromoStatus status
    );
    
    // Check if user already has an active promo for a service
    boolean existsByProfileIdAndServiceIdAndStatus(
        UUID profileId,
        UUID serviceId,
        PromoUser.PromoStatus status
    );
    
    // Find specific promo user by profile, service, and plan
    Optional<PromoUser> findByProfileIdAndServiceIdAndPlanId(UUID profileId, UUID serviceId, UUID planId);
    
    // Find expired promo users (for auto-expiry tasks)
    List<PromoUser> findByStatusAndExpiryDateBefore(
        PromoUser.PromoStatus status,
        Instant now
    );
}
