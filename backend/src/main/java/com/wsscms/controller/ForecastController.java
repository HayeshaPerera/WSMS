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
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forecasts")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ForecastController {

    @Autowired
    private DemandForecastRepository forecastRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private SalesHistoryRepository salesHistoryRepository;

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

        List<Product> products = productRepository.findByActiveTrue();
        LocalDate startDate = LocalDate.now();
        
        List<DemandForecast> forecasts = products.stream()
                .flatMap(product -> {
                    // Simple forecasting based on average sales
                    var salesHistory = salesHistoryRepository.findByProductAndSupermarket(product.getId(), supermarketId);
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
