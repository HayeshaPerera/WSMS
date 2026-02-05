package com.wsscms.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class InventoryDTO {
    private Long id;
    
    @NotNull(message = "Product ID is required")
    private Long productId;
    
    private String productName;
    private String productSku;
    
    private Long warehouseId;
    private String warehouseName;
    
    private Long supermarketId;
    private String supermarketName;
    
    @NotNull(message = "Quantity is required")
    @PositiveOrZero(message = "Quantity must be zero or positive")
    private Integer quantity;
    
    private Integer reorderLevel;
    private String location;
}
