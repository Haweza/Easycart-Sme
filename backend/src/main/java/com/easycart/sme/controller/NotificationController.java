package com.easycart.sme.controller;

import com.easycart.sme.dto.NotificationDTO;
import com.easycart.sme.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Notification endpoints — all require a valid JWT (authenticated user).
 * <p>
 * GET  /api/notifications/my           → list this user's notifications
 * GET  /api/notifications/unread-count → {count: N}
 * PUT  /api/notifications/{id}/read    → mark one as read
 * PUT  /api/notifications/read-all     → mark all as read
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<List<NotificationDTO>> getMyNotifications(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(notificationService.getMyNotifications(userId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationDTO> markAsRead(
            @PathVariable UUID id, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(notificationService.markAsRead(id, userId));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }
}
