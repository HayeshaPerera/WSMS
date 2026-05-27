package com.wsscms.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReconciliationDTO {
    private Long id;
    private Long warehouseId;
    private Long supermarketId;
    private LocalDate reconciliationDate;
    private String status;
    private Integer totalDiscrepancyCount;
    private Long reconciledById;
    private String reconciledByName;
    private LocalDateTime reconciledAt;
    private String notes;
    private List<ReconciliationItemDTO> items;
}
