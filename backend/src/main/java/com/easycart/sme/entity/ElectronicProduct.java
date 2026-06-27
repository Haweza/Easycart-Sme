package com.easycart.sme.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * ElectronicProduct — JPA entity for admin-managed electronic product listings.
 * Posts are active for 3 days from createdAt. Stored image as Base64 Data URL.
 */
@Entity
@Table(name = "electronic_products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ElectronicProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String price;

    @Column(name = "image_content", columnDefinition = "TEXT", nullable = false)
    private String imageContent; // Base64 Data URL e.g. "data:image/png;base64,..."

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
