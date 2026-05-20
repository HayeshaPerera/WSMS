package com.wsscms.dto;

import lombok.Data;

@Data
public class DeliveryItemDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Integer expectedQuantity;
    private Integer actualQuantity;
    private String status;
    private String notes;
}
