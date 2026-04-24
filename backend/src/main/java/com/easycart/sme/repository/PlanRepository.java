package com.easycart.sme.repository;

import com.easycart.sme.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PlanRepository extends JpaRepository<Plan, UUID> {
}
