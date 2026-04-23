package com.easycart.sme.controller;

import com.easycart.sme.dto.InviteCreateRequest;
import com.easycart.sme.dto.InviteResponse;
import com.easycart.sme.service.InviteService;
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
@RequestMapping("/api/invites")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    // -------------------------------------------------------
    //  ADMIN: Create a new invite
    // -------------------------------------------------------
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InviteResponse> createInvite(
            @Valid @RequestBody InviteCreateRequest request,
            Principal principal) {
        UUID adminId = UUID.fromString(principal.getName());
        InviteResponse response = inviteService.createInvite(request, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // -------------------------------------------------------
    //  ADMIN: Get all invites
    // -------------------------------------------------------
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<InviteResponse>> getAllInvites() {
        return ResponseEntity.ok(inviteService.getAllInvites());
    }

    // -------------------------------------------------------
    //  CUSTOMER: Get own invites
    // -------------------------------------------------------
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InviteResponse>> getMyInvites(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(inviteService.getMyInvites(userId));
    }

    // -------------------------------------------------------
    //  CUSTOMER: Accept invite
    // -------------------------------------------------------
    @PostMapping("/{id}/accept")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InviteResponse> acceptInvite(
            @PathVariable UUID id,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(inviteService.acceptInvite(id, userId));
    }

    // -------------------------------------------------------
    //  CUSTOMER: Decline invite
    // -------------------------------------------------------
    @PostMapping("/{id}/decline")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InviteResponse> declineInvite(
            @PathVariable UUID id,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(inviteService.declineInvite(id, userId));
    }
}
