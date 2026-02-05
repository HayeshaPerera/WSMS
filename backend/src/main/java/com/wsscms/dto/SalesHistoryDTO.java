package com.wsscms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SalesHistoryDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Long supermarketId;
    private String supermarketName;
    private LocalDate saleDate;
    private Integer quantitySold;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private String notes;
}
