package com.easycart.sme.service;

import com.easycart.sme.dto.NotificationDTO;
import com.easycart.sme.entity.Notification;
import com.easycart.sme.exception.ForbiddenException;
import com.easycart.sme.exception.NotFoundException;
import com.easycart.sme.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // -------------------------------------------------------
    //  Core: create a notification
    // -------------------------------------------------------

    /**
     * Persists a new notification for the given user.
     * Silently skips if userId is null to avoid breaking callers.
     */
    @Transactional
    public void createNotification(UUID userId,
                                   String title,
                                   String message,
                                   Notification.NotificationType type) {
        if (userId == null) {
            log.warn("createNotification called with null userId — skipping");
            return;
        }
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
        log.debug("Notification created for user {} — type={}", userId, type);
    }

    // -------------------------------------------------------
    //  Read
    // -------------------------------------------------------

    /** Returns all notifications for the authenticated user, newest first. */
    @Transactional(readOnly = true)
    public List<NotificationDTO> getMyNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationDTO::from)
                .collect(Collectors.toList());
    }

    /** Returns the count of unread notifications for the authenticated user. */
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // -------------------------------------------------------
    //  Mark as read
    // -------------------------------------------------------

    /** Marks a single notification as read. Throws if it belongs to another user. */
    @Transactional
    public NotificationDTO markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found"));
        if (!notification.getUserId().equals(userId)) {
            throw new ForbiddenException("Cannot mark another user's notification as read");
        }
        if (!notification.isRead()) {
            notification.setRead(true);
            notification = notificationRepository.save(notification);
        }
        return NotificationDTO.from(notification);
    }

    /** Marks every unread notification for this user as read. */
    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }
}
