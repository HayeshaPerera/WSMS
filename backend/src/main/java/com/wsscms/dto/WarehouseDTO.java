package com.wsscms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WarehouseDTO {
    private Long id;
    
    @NotBlank(message = "Code is required")
    private String code;
    
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Location is required")
    private String location;
    
    private String address;
    
    @NotNull(message = "Capacity is required")
    private Integer capacity;
    
    private Integer currentStock;
    private String contactPhone;
    private String contactEmail;
    private Boolean active;
}
