package com.wsscms.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class GrnItemDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Integer quantity;
    private BigDecimal unitCost;
    private String batchNumber;
    private LocalDate expiryDate;
    private Integer parLevel;
}
