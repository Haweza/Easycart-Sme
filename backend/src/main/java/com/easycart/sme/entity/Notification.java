package com.easycart.sme.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notifications_user_id", columnList = "user_id"),
    @Index(name = "idx_notifications_is_read", columnList = "is_read")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The user this notification is addressed to */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum NotificationType {
        ACCOUNT_APPROVED,
        REQUEST_APPROVED,
        REQUEST_REJECTED,
        INVITE_RECEIVED,
        INVITE_ACCEPTED,
        INVITE_DECLINED,
        PROMO_APPROVED,
        PROMO_REJECTED,
        PROMO_EXPIRED
    }
}
