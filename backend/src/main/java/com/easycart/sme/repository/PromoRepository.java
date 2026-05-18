package com.easycart.sme.repository;

import com.easycart.sme.entity.Promo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromoRepository extends JpaRepository<Promo, UUID> {
    Optional<Promo> findFirstByOrderByCreatedAtDesc();
}
