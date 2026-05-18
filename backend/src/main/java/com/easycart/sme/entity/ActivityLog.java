package com.easycart.sme.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Column(name = "actor_name", nullable = false)
    private String actorName;

    @Column(nullable = false)
    private String action; // e.g. "REMOVE_MEMBER"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description; // e.g. "Removed John Banda from Spotify Family"

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
