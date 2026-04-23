package com.easycart.sme.controller;

import com.easycart.sme.dto.ReviewRequestDto;
import com.easycart.sme.dto.ServiceRequestCreateDto;
import com.easycart.sme.dto.ServiceRequestResponse;
import com.easycart.sme.service.ServiceRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/service-requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    /** POST /api/service-requests — Customer submits a service request */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ServiceRequestResponse> createRequest(
            @Valid @RequestBody ServiceRequestCreateDto dto,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(serviceRequestService.createRequest(dto, userId));
    }

    /** GET /api/service-requests/my — Customer views own requests */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ServiceRequestResponse>> getMyRequests(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(serviceRequestService.getMyRequests(userId));
    }

    /** GET /api/service-requests/pending — Admin views all pending requests */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ServiceRequestResponse>> getPendingRequests() {
        return ResponseEntity.ok(serviceRequestService.getAllPendingRequests());
    }

    /** PUT /api/service-requests/{id}/review — Admin approves/rejects */
    @PutMapping("/{id}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServiceRequestResponse> reviewRequest(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequestDto dto,
            Principal principal) {
        UUID adminId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(serviceRequestService.reviewRequest(
                id, dto.isApproved(), dto.getAdminNote(), adminId));
    }
}
