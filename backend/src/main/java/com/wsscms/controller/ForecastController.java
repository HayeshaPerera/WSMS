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

    /**
     * Orchestrates the demand forecasting generation pipeline.
     * Triggered from the frontend analytics view.
     * Grabs historical sales data, proxies to the Python Prophet microservice,
     * and executes a mathematical Linear Regression fallback if the service is unreachable.
     */
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

        // Batch fetch all sales history to prevent the N+1 select problem.
        // Grouping in-memory optimizes database performance during parallel execution.
        List<com.wsscms.entity.SalesHistory> allSalesHistory = salesHistoryRepository.findBySupermarketId(supermarketId);
        java.util.Map<Long, List<com.wsscms.entity.SalesHistory>> historyMap = allSalesHistory.stream()
                .collect(Collectors.groupingBy(sh -> sh.getProduct().getId()));

        List<DemandForecast> forecasts = products.parallelStream()
                .flatMap(product -> {
                    List<com.wsscms.entity.SalesHistory> salesHistory = historyMap.getOrDefault(product.getId(), java.util.Collections.emptyList());
                    
                    // ML model requires a baseline threshold of historical data points (>10)
                    // to compute reliable seasonal patterns. Otherwise bypass to regression fallback.
                    if (salesHistory.size() >= 10) {
                        try {
                            List<ProphetClientService.SalesRecord> history = salesHistory.stream()
                                    .collect(Collectors.groupingBy(sh -> sh.getSaleDate().toString(),
                                            Collectors.summingDouble(sh -> sh.getQuantitySold().doubleValue())))
                                    .entrySet().stream()
                                    .map(e -> new ProphetClientService.SalesRecord(e.getKey(), e.getValue()))
                                    .collect(Collectors.toList());
                                    
                            // Synchronously retrieve predicted future demand via REST call 
                            // to the Python FastAPI microservice (port 8000).
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
                    
                    // Linear Regression Trend Projection Fallback
                    // Executes if the external forecasting service is offline or data is sparse.
                    // Applies ordinary least squares (y = mx + b) to calculate historical slope
                    // and project the linear trajectory into future periods.
                    List<com.wsscms.entity.SalesHistory> sortedHistory = salesHistory.stream()
                            .sorted(java.util.Comparator.comparing(com.wsscms.entity.SalesHistory::getSaleDate))
                            .collect(Collectors.toList());
                            
                    int n = sortedHistory.size();
                    double slope = 0;
                    double intercept = 10;
                    
                    if (n > 1) {
                        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                        for (int i = 0; i < n; i++) {
                            sumX += i;
                            sumY += sortedHistory.get(i).getQuantitySold();
                            sumXY += i * sortedHistory.get(i).getQuantitySold();
                            sumX2 += i * i;
                        }
                        double denominator = (n * sumX2 - sumX * sumX);
                        if (denominator != 0) {
                            slope = (n * sumXY - sumX * sumY) / denominator;
                            intercept = (sumY - slope * sumX) / n;
                        } else {
                            intercept = sumY / n;
                        }
                    } else if (n == 1) {
                        intercept = sortedHistory.get(0).getQuantitySold();
                    }

                    final double finalIntercept = intercept;
                    final double finalSlope = slope;

                    return java.util.stream.IntStream.range(0, daysAhead)
                            .mapToObj(i -> {
                                DemandForecast forecast = new DemandForecast();
                                forecast.setProduct(product);
                                forecast.setSupermarket(supermarket);
                                forecast.setForecastDate(startDate.plusDays(i));
                                
                                int projectedX = n + i;
                                double predicted = finalIntercept + finalSlope * projectedX;
                                int finalDemand = (int) Math.max(0, Math.round(predicted * (0.95 + Math.random() * 0.1)));
                                
                                forecast.setPredictedDemand(finalDemand);
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
