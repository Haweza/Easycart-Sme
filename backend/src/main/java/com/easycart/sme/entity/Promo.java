package com.easycart.sme.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "promos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Promo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "service_name", nullable = false)
    private String serviceName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false)
    private String price;

    @Column(name = "image_content", columnDefinition = "TEXT")
    private String imageContent; // Base64 Data URL

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
