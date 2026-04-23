package com.easycart.sme.repository;

import com.easycart.sme.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, UUID> {
    List<ServiceRequest> findByUserId(UUID userId);
    List<ServiceRequest> findByStatus(ServiceRequest.RequestStatus status);
    boolean existsByUserIdAndServiceIdAndStatus(
            UUID userId, UUID serviceId, ServiceRequest.RequestStatus status);
}
