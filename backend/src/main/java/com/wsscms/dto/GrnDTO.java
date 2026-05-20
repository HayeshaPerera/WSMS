package com.wsscms.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class GrnDTO {
    private Long id;
    private String grnNumber;
    private Long warehouseId;
    private String warehouseName;
    private String supplierName;
    private Long receivedById;
    private String receivedByName;
    private String status;
    private String notes;
    private LocalDateTime receivedDate;
    private LocalDateTime createdAt;
    
    private List<GrnItemDTO> items;
}
