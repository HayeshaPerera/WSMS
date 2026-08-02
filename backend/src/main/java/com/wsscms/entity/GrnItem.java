package com.wsscms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "grn_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grn_header_id", nullable = false)
    private GrnHeader grnHeader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_cost", precision = 10, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "batch_number", length = 50)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "ordered_qty", nullable = false)
    private Integer orderedQty;

    @Column(name = "received_qty", nullable = false)
    private Integer receivedQty;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "par_level")
    private Integer parLevel;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (orderedQty == null) orderedQty = quantity != null ? quantity : 0;
        if (receivedQty == null) receivedQty = quantity != null ? quantity : 0;
        if (unitPrice == null) unitPrice = unitCost != null ? unitCost : BigDecimal.ZERO;
        if (parLevel == null && product != null && product.getReorderLevel() != null) parLevel = product.getReorderLevel();
        if (parLevel == null) parLevel = 20;
    }
}
