package com.wsscms.dto;

import com.wsscms.entity.Delivery;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeliveryDTO {
    private Long id;
    private String trackingNumber;
    
    private Long stockRequestId;
    private String stockRequestNumber;
    
    private Long warehouseId;
    private String warehouseName;
    
    private Long supermarketId;
    private String supermarketName;
    
    private Long productId;
    private String productName;
    private String productSku;
    
    private Integer quantity;
    private Delivery.DeliveryStatus status;
    
    private String driverName;
    private String vehicleNumber;
    private String currentLocation;
    private String notes;
    
    private LocalDateTime createdAt;
    private LocalDateTime dispatchedAt;
    private LocalDateTime inTransitAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime estimatedDelivery;
    private String failureReason;
    private LocalDateTime failedAt;
    
    private Long receivedById;
    private String receivedByName;
}
