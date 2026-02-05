package com.wsscms.dto;

import com.wsscms.entity.StockRequest;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StockRequestDTO {
    private Long id;
    private String requestNumber;
    
    @NotNull(message = "Supermarket ID is required")
    private Long supermarketId;
    private String supermarketName;
    
    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;
    private String warehouseName;
    
    @NotNull(message = "Product ID is required")
    private Long productId;
    private String productName;
    private String productSku;
    
    @NotNull(message = "Requested quantity is required")
    @Positive(message = "Requested quantity must be positive")
    private Integer requestedQuantity;
    
    private Integer approvedQuantity;
    private StockRequest.RequestStatus status;
    private StockRequest.Priority priority;
    private String notes;
    private String rejectionReason;
    
    private Long requestedById;
    private String requestedByName;
    private Long approvedById;
    private String approvedByName;
    
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime completedAt;
}
