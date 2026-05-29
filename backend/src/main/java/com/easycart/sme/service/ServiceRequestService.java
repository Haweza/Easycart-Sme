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
    private final com.easycart.sme.repository.SubscriptionRepository subscriptionRepository;
    private final com.easycart.sme.repository.FamilyRepository familyRepository;
    private final com.easycart.sme.repository.FamilyMemberRepository familyMemberRepository;

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

    /** Admin views all requests (pending, approved, rejected) */
    public List<ServiceRequestResponse> getAllRequests() {
        return requestRepository.findAll()
                .stream()
                .map(ServiceRequestResponse::from)
                .toList();
    }

    /** Admin reviews a request */
    @Transactional
    public ServiceRequestResponse reviewRequest(UUID requestId, com.easycart.sme.dto.ReviewRequestDto dto, UUID adminId) {
        ServiceRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (req.getStatus() != ServiceRequest.RequestStatus.PENDING) {
            throw new BadRequestException("Only PENDING requests can be reviewed");
        }

        Profile admin = profileRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin not found"));

        boolean approved = dto.isApproved();
        req.setStatus(approved ? ServiceRequest.RequestStatus.APPROVED : ServiceRequest.RequestStatus.REJECTED);
        req.setAdminNote(dto.getAdminNote());
        req.setReviewedBy(admin);
        req.setReviewedAt(Instant.now());

        if (approved) {
            Instant start = dto.getStartDate() != null ? dto.getStartDate() : Instant.now();
            Instant expiry = dto.getExpiresAt();
            if (expiry == null) {
                expiry = start.plus(java.time.Duration.ofDays(30)); // fallback
                if (req.getPlan() != null) {
                    String planName = req.getPlan().getName().toLowerCase();
                    if (planName.contains("month")) {
                        String digits = planName.replaceAll("[^\\d]", "");
                        int months = digits.isEmpty() ? 1 : Integer.parseInt(digits);
                        expiry = java.time.ZonedDateTime.ofInstant(start, java.time.ZoneId.systemDefault()).plusMonths(months).toInstant();
                    } else if (planName.contains("annual") || planName.contains("year")) {
                        expiry = java.time.ZonedDateTime.ofInstant(start, java.time.ZoneId.systemDefault()).plusYears(1).toInstant();
                    }
                } else if (req.getService() != null && req.getService().getBillingCycle() != null) {
                    String cycle = req.getService().getBillingCycle().toLowerCase();
                    if (cycle.contains("annual") || cycle.contains("year")) {
                        expiry = java.time.ZonedDateTime.ofInstant(start, java.time.ZoneId.systemDefault()).plusYears(1).toInstant();
                    } else {
                        expiry = java.time.ZonedDateTime.ofInstant(start, java.time.ZoneId.systemDefault()).plusMonths(1).toInstant();
                    }
                }
            }
            req.setStartDate(start);
            req.setExpiresAt(expiry);

            // Create active individual subscription containing the real access details
            com.easycart.sme.entity.Family family = null;
            if (req.getService().getIsFamilyType() != null && req.getService().getIsFamilyType()) {
                // First check if they are the organizer of a family
                family = familyRepository.findByOrganizerId(req.getUser().getId())
                        .stream().findFirst().orElse(null);
                
                if (family == null) {
                    // Check if they are an active member of any family
                    var membership = familyMemberRepository.findByUserId(req.getUser().getId())
                            .stream()
                            .filter(m -> m.getStatus() == com.easycart.sme.entity.FamilyMember.MembershipStatus.ACTIVE)
                            .findFirst()
                            .orElse(null);
                    if (membership != null) {
                        family = membership.getFamily();
                    }
                }
            }

            com.easycart.sme.entity.Subscription subscription = com.easycart.sme.entity.Subscription.builder()
                    .user(req.getUser())
                    .service(req.getService())
                    .plan(req.getPlan())
                    .startDate(start)
                    .expiresAt(expiry)
                    .status(com.easycart.sme.entity.Subscription.SubscriptionStatus.ACTIVE)
                    .family(family)
                    .build();
            subscriptionRepository.save(subscription);
        }

        return ServiceRequestResponse.from(requestRepository.save(req));
    }
}
