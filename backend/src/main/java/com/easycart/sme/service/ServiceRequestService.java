package com.easycart.sme.service;

import com.easycart.sme.dto.ServiceRequestCreateDto;
import com.easycart.sme.dto.ServiceRequestResponse;
import com.easycart.sme.entity.Profile;
import com.easycart.sme.entity.ServiceRequest;
import com.easycart.sme.exception.BadRequestException;
import com.easycart.sme.exception.ConflictException;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.ProfileRepository;
import com.easycart.sme.repository.ServiceRepository;
import com.easycart.sme.repository.ServiceRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private final ServiceRequestRepository requestRepository;
    private final ProfileRepository profileRepository;
    private final ServiceRepository serviceRepository;
    private final com.easycart.sme.repository.PlanRepository planRepository;

    /** Customer submits a new service request */
    @Transactional
    public ServiceRequestResponse createRequest(ServiceRequestCreateDto dto, UUID userId) {
        Profile user = profileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (user.getRole() != Profile.UserRole.CUSTOMER) {
            throw new ForbiddenException("Only CUSTOMER users can submit service requests");
        }

        com.easycart.sme.entity.Service service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new NotFoundException("Service not found"));

        com.easycart.sme.entity.Plan plan = null;
        if (dto.getPlanId() != null) {
            plan = planRepository.findById(dto.getPlanId())
                    .orElseThrow(() -> new NotFoundException("Plan not found"));
        }

        // Block duplicate PENDING requests
        if (plan != null) {
            if (requestRepository.existsByUserIdAndServiceIdAndPlanIdAndStatus(
                    userId, service.getId(), plan.getId(), ServiceRequest.RequestStatus.PENDING)) {
                throw new ConflictException("You already have a pending request for this specific plan");
            }
        } else {
            if (requestRepository.existsByUserIdAndServiceIdAndStatus(
                    userId, service.getId(), ServiceRequest.RequestStatus.PENDING)) {
                throw new ConflictException("You already have a pending request for this service");
            }
        }

        ServiceRequest req = ServiceRequest.builder()
                .user(user)
                .service(service)
                .plan(plan)
                .message(dto.getMessage())
                .status(ServiceRequest.RequestStatus.PENDING)
                .build();

        return ServiceRequestResponse.from(requestRepository.save(req));
    }

    /** Customer views own requests */
    public List<ServiceRequestResponse> getMyRequests(UUID userId) {
        return requestRepository.findByUserId(userId)
                .stream()
                .map(ServiceRequestResponse::from)
                .toList();
    }

    /** Admin views all pending requests */
    public List<ServiceRequestResponse> getAllPendingRequests() {
        return requestRepository.findByStatus(ServiceRequest.RequestStatus.PENDING)
                .stream()
                .map(ServiceRequestResponse::from)
                .toList();
    }

    /** Admin reviews a request */
    @Transactional
    public ServiceRequestResponse reviewRequest(UUID requestId, boolean approved, String adminNote, UUID adminId) {
        ServiceRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (req.getStatus() != ServiceRequest.RequestStatus.PENDING) {
            throw new BadRequestException("Only PENDING requests can be reviewed");
        }

        Profile admin = profileRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin not found"));

        req.setStatus(approved ? ServiceRequest.RequestStatus.APPROVED : ServiceRequest.RequestStatus.REJECTED);
        req.setAdminNote(adminNote);
        req.setReviewedBy(admin);
        req.setReviewedAt(Instant.now());

        return ServiceRequestResponse.from(requestRepository.save(req));
    }
}
