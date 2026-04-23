package com.easycart.sme.repository;

import com.easycart.sme.entity.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {
    List<FamilyMember> findByFamilyId(UUID familyId);
    List<FamilyMember> findByUserId(UUID userId);
    Optional<FamilyMember> findByFamilyIdAndUserId(UUID familyId, UUID userId);
    boolean existsByUserIdAndFamilyIdAndStatus(
            UUID userId, UUID familyId, FamilyMember.MembershipStatus status);
    int countByFamilyIdAndStatus(UUID familyId, FamilyMember.MembershipStatus status);
}
