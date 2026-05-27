package com.wsscms.dto;

import lombok.Data;

@Data
public class ReconciliationItemDTO {
    private Long id;
    private Long productId;
    private String productName;
    private Integer systemQuantity;
    private Integer physicalCount;
    private Integer variance;
    private String adjustmentNotes;
}
