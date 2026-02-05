package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AnalyticsController {

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private StockRequestRepository stockRequestRepository;

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SalesHistoryRepository salesHistoryRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalWarehouses", warehouseRepository.count());
        stats.put("activeWarehouses", warehouseRepository.findByActiveTrue().size());
        stats.put("totalSupermarkets", supermarketRepository.count());
        stats.put("activeSupermarkets", supermarketRepository.findByActiveTrue().size());
        stats.put("totalProducts", productRepository.count());
        stats.put("activeProducts", productRepository.findByActiveTrue().size());
        stats.put("totalUsers", userRepository.count());
        stats.put("activeUsers", userRepository.findByActiveTrue().size());
        stats.put("pendingRequests", stockRequestRepository.findPendingRequests().size());
        stats.put("activeDeliveries", deliveryRepository.findActiveDeliveries().size());
        stats.put("lowStockItems", inventoryRepository.findLowStockItems().size());

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWarehouseStats(@PathVariable Long warehouseId) {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalInventoryItems", inventoryRepository.findByWarehouseId(warehouseId).size());
        stats.put("lowStockItems", inventoryRepository.findLowStockByWarehouseId(warehouseId).size());
        stats.put("pendingRequests", stockRequestRepository.findPendingByWarehouseId(warehouseId).size());
        stats.put("activeDeliveries", deliveryRepository.findActiveByWarehouseId(warehouseId).size());
        stats.put("supermarkets", supermarketRepository.findByWarehouseId(warehouseId).size());

        // Calculate total inventory value
        var inventoryItems = inventoryRepository.findByWarehouseId(warehouseId);
        double totalValue = inventoryItems.stream()
                .mapToDouble(inv -> inv.getQuantity() * 
                        (inv.getProduct().getUnitPrice() != null ? inv.getProduct().getUnitPrice().doubleValue() : 0))
                .sum();
        stats.put("totalInventoryValue", totalValue);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSupermarketStats(@PathVariable Long supermarketId) {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalInventoryItems", inventoryRepository.findBySupermarketId(supermarketId).size());
        stats.put("lowStockItems", inventoryRepository.findLowStockBySupermarketId(supermarketId).size());
        stats.put("pendingRequests", stockRequestRepository.findBySupermarketId(supermarketId).stream()
                .filter(sr -> sr.getStatus().name().equals("PENDING")).count());
        stats.put("activeDeliveries", deliveryRepository.findActiveBySupermarketId(supermarketId).size());

        // Get sales data
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        var salesHistory = salesHistoryRepository.findBySupermarketAndDateRange(supermarketId, startDate, endDate);
        
        double totalSales = salesHistory.stream()
                .mapToDouble(sh -> sh.getTotalAmount() != null ? sh.getTotalAmount().doubleValue() : 0)
                .sum();
        stats.put("totalSales30Days", totalSales);
        stats.put("totalTransactions30Days", salesHistory.size());

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/inventory/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInventorySummary() {
        Map<String, Object> summary = new HashMap<>();
        
        var allInventory = inventoryRepository.findAll();
        var lowStock = inventoryRepository.findLowStockItems();
        
        summary.put("totalItems", allInventory.size());
        summary.put("lowStockItems", lowStock.size());
        summary.put("totalQuantity", allInventory.stream().mapToInt(inv -> inv.getQuantity()).sum());
        
        double totalValue = allInventory.stream()
                .mapToDouble(inv -> inv.getQuantity() * 
                        (inv.getProduct().getUnitPrice() != null ? inv.getProduct().getUnitPrice().doubleValue() : 0))
                .sum();
        summary.put("totalValue", totalValue);

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/requests/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRequestsSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        var allRequests = stockRequestRepository.findAll();
        
        summary.put("total", allRequests.size());
        summary.put("pending", allRequests.stream().filter(r -> r.getStatus().name().equals("PENDING")).count());
        summary.put("approved", allRequests.stream().filter(r -> r.getStatus().name().equals("APPROVED")).count());
        summary.put("rejected", allRequests.stream().filter(r -> r.getStatus().name().equals("REJECTED")).count());
        summary.put("completed", allRequests.stream().filter(r -> r.getStatus().name().equals("COMPLETED")).count());
        summary.put("inTransit", allRequests.stream().filter(r -> r.getStatus().name().equals("IN_TRANSIT")).count());

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/deliveries/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeliveriesSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        var allDeliveries = deliveryRepository.findAll();
        
        summary.put("total", allDeliveries.size());
        summary.put("pending", allDeliveries.stream().filter(d -> d.getStatus().name().equals("PENDING")).count());
        summary.put("dispatched", allDeliveries.stream().filter(d -> d.getStatus().name().equals("DISPATCHED")).count());
        summary.put("inTransit", allDeliveries.stream().filter(d -> d.getStatus().name().equals("IN_TRANSIT")).count());
        summary.put("delivered", allDeliveries.stream().filter(d -> d.getStatus().name().equals("DELIVERED")).count());
        summary.put("cancelled", allDeliveries.stream().filter(d -> d.getStatus().name().equals("CANCELLED")).count());

        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
