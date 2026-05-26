package com.wsscms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Where;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_discrepancies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Where(clause = "is_deleted = false")
public class DeliveryDiscrepancy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_item_id", nullable = false)
    private DeliveryItem deliveryItem;

    @Column(name = "quantity_variance", nullable = false)
    private Integer quantityVariance;

    @Column(name = "variance_reason", length = 255)
    private String varianceReason;

    @Column(name = "investigation_notes", columnDefinition = "TEXT")
    private String investigationNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "investigated_by")
    private User investigatedBy;

    @Column(name = "investigated_at")
    private LocalDateTime investigatedAt;

    @Column(name = "resolved")
    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "resolution_date")
    private LocalDateTime resolutionDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
