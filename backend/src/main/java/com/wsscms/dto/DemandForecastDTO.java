package com.wsscms.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class DemandForecastDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Long supermarketId;
    private String supermarketName;
    private LocalDate forecastDate;
    private Integer predictedDemand;
    private Double confidenceLevel;
}
