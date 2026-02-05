package com.wsscms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SupermarketDTO {
    private Long id;
    
    @NotBlank(message = "Code is required")
    private String code;
    
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Location is required")
    private String location;
    
    private String address;
    
    @NotNull(message = "Storage capacity is required")
    private Integer storageCapacity;
    
    private Integer currentStock;
    private String contactPhone;
    private String contactEmail;
    private Long assignedWarehouseId;
    private String assignedWarehouseName;
    private Boolean active;
}
