package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.DemandForecastDTO;
import com.wsscms.entity.DemandForecast;
import com.wsscms.entity.Product;
import com.wsscms.entity.Supermarket;
import com.wsscms.repository.DemandForecastRepository;
import com.wsscms.repository.ProductRepository;
import com.wsscms.repository.SupermarketRepository;
import com.wsscms.repository.SalesHistoryRepository;
import com.wsscms.service.ProphetClientService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/forecasts")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ForecastController {

    private static final Logger logger = LoggerFactory.getLogger(ForecastController.class);

    @Autowired
    private DemandForecastRepository forecastRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private SalesHistoryRepository salesHistoryRepository;

    @Autowired
    private ProphetClientService prophetClientService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DemandForecastDTO>>> getAllForecasts() {
        List<DemandForecastDTO> forecasts = forecastRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(forecasts));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<DemandForecastDTO>>> getForecastsByProduct(@PathVariable Long productId) {
        List<DemandForecastDTO> forecasts = forecastRepository.findByProductId(productId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(forecasts));
    }

    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<DemandForecastDTO>>> getForecastsBySupermarket(@PathVariable Long supermarketId) {
        List<DemandForecastDTO> forecasts = forecastRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(forecasts));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<DemandForecastDTO>>> getForecastsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<DemandForecastDTO> forecasts = forecastRepository.findByDateRange(startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(forecasts));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<List<DemandForecastDTO>>> generateForecasts(
            @RequestParam Long supermarketId,
            @RequestParam(defaultValue = "7") int daysAhead) {
        
        Supermarket supermarket = supermarketRepository.findById(supermarketId)
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));

        List<Product> products = productRepository.findByIsActiveTrue();
        LocalDate startDate = LocalDate.now();
        
        // Clean old forecasts for the supermarket to avoid duplicates
        List<DemandForecast> existing = forecastRepository.findBySupermarketId(supermarketId);
        if (!existing.isEmpty()) {
            forecastRepository.deleteAll(existing);
        }

        // Pre-fetch all sales history for the supermarket to avoid database connection pool starvation
        List<com.wsscms.entity.SalesHistory> allSalesHistory = salesHistoryRepository.findBySupermarketId(supermarketId);
        java.util.Map<Long, List<com.wsscms.entity.SalesHistory>> historyMap = allSalesHistory.stream()
                .collect(Collectors.groupingBy(sh -> sh.getProduct().getId()));

        List<DemandForecast> forecasts = products.parallelStream()
                .flatMap(product -> {
                    List<com.wsscms.entity.SalesHistory> salesHistory = historyMap.getOrDefault(product.getId(), java.util.Collections.emptyList());
                    
                    if (salesHistory.size() >= 10) {
                        try {
                            List<ProphetClientService.SalesRecord> history = salesHistory.stream()
                                    .map(sh -> new ProphetClientService.SalesRecord(sh.getSaleDate().toString(), sh.getQuantitySold().doubleValue()))
                                    .collect(Collectors.toList());
                                    
                            List<ProphetClientService.ForecastPoint> points = prophetClientService.getForecast(
                                    product.getId(), supermarketId, history, daysAhead);
                                    
                            logger.info("Successfully fetched Prophet AI forecast for product={} supermarket={}", product.getId(), supermarketId);
                            
                            return points.stream().map(pt -> {
                                DemandForecast forecast = new DemandForecast();
                                forecast.setProduct(product);
                                forecast.setSupermarket(supermarket);
                                forecast.setForecastDate(LocalDate.parse(pt.ds()));
                                forecast.setPredictedDemand(pt.yhat().intValue());
                                
                                double confidence = 0.85;
                                if (pt.yhat().doubleValue() > 0) {
                                    double width = pt.yhat_upper().doubleValue() - pt.yhat_lower().doubleValue();
                                    confidence = Math.max(0.5, Math.min(0.99, 1.0 - (width / (2.0 * pt.yhat().doubleValue()))));
                                }
                                forecast.setConfidenceLevel(confidence);
                                return forecast;
                            });
                        } catch (Exception e) {
                            logger.warn("Prophet forecasting failed for product={} supermarket={} - falling back to moving average. Error: {}", 
                                    product.getId(), supermarketId, e.getMessage());
                        }
                    }
                    
                    // Fallback to simple forecasting based on average sales
                    double avgSales = salesHistory.stream()
                            .mapToInt(sh -> sh.getQuantitySold())
                            .average()
                            .orElse(10.0);

                    return java.util.stream.IntStream.range(0, daysAhead)
                            .mapToObj(i -> {
                                DemandForecast forecast = new DemandForecast();
                                forecast.setProduct(product);
                                forecast.setSupermarket(supermarket);
                                forecast.setForecastDate(startDate.plusDays(i));
                                forecast.setPredictedDemand((int) Math.round(avgSales * (0.9 + Math.random() * 0.2)));
                                forecast.setConfidenceLevel(0.7 + Math.random() * 0.2);
                                return forecast;
                            });
                })
                .collect(Collectors.toList());

        List<DemandForecast> savedForecasts = forecastRepository.saveAll(forecasts);
        
        List<DemandForecastDTO> forecastDTOs = savedForecasts.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Forecasts generated successfully", forecastDTOs));
    }

    private DemandForecastDTO convertToDTO(DemandForecast forecast) {
        DemandForecastDTO dto = new DemandForecastDTO();
        dto.setId(forecast.getId());
        dto.setForecastDate(forecast.getForecastDate());
        dto.setPredictedDemand(forecast.getPredictedDemand());
        dto.setConfidenceLevel(forecast.getConfidenceLevel());

        if (forecast.getProduct() != null) {
            dto.setProductId(forecast.getProduct().getId());
            dto.setProductName(forecast.getProduct().getName());
            dto.setProductSku(forecast.getProduct().getSku());
        }

        if (forecast.getSupermarket() != null) {
            dto.setSupermarketId(forecast.getSupermarket().getId());
            dto.setSupermarketName(forecast.getSupermarket().getName());
        }

        return dto;
    }
}
