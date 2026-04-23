package com.easycart.sme.repository;

import com.easycart.sme.entity.Family;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FamilyRepository extends JpaRepository<Family, UUID> {
    List<Family> findByOrganizerId(UUID organizerId);
    boolean existsByName(String name);
}
