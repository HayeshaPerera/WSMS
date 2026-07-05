package com.wsscms.controller;

// Import the standard API response DTO for consistent JSON structures
import com.wsscms.dto.ApiResponse;

// Import all repository interfaces for database access
import com.wsscms.repository.*;

// Import Spring annotations and classes
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Import Java utility classes for dates, maps, and HashMaps
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * AnalyticsController
 * 
 * Provides REST API endpoints for fetching aggregated statistics and summaries
 * used by the frontend dashboards (e.g., Admin dashboard, Warehouse dashboard, Supermarket dashboard).
 */
@RestController
// Base URL path for all endpoints in this controller
@RequestMapping("/api/v1/analytics")
// Allow cross-origin requests from any domain (CORS configuration)
@CrossOrigin(origins = "*", maxAge = 3600)
public class AnalyticsController {

    // Inject all required Spring Data JPA repositories
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

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/analytics/dashboard
    // ─────────────────────────────────────────────────────────
    /**
     * Gets system-wide global statistics. Typically used by the top-level Admin Dashboard.
     * 
     * @return A map of string keys to numeric values representing various system totals.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        // Create a Map to hold the key-value pairs of statistics
        Map<String, Object> stats = new HashMap<>();
        
        // Count total and active warehouses
        stats.put("totalWarehouses", warehouseRepository.count());
        stats.put("activeWarehouses", warehouseRepository.findByIsActiveTrue().size());
        
        // Count total and active supermarkets
        stats.put("totalSupermarkets", supermarketRepository.count());
        stats.put("activeSupermarkets", supermarketRepository.findByIsActiveTrue().size());
        
        // Count total and active products in the catalog
        stats.put("totalProducts", productRepository.count());
        stats.put("activeProducts", productRepository.findByIsActiveTrue().size());
        
        // Count total and active users in the system
        stats.put("totalUsers", userRepository.count());
        stats.put("activeUsers", userRepository.findByIsActiveTrue().size());
        
        // Count pending stock requests across all stores
        stats.put("pendingRequests", stockRequestRepository.findPendingRequests().size());
        
        // Count active deliveries (in transit, dispatched, etc.)
        stats.put("activeDeliveries", deliveryRepository.findActiveDeliveries().size());
        
        // Count inventory items that have fallen below their minimum stock levels globally
        stats.put("lowStockItems", inventoryRepository.findLowStockItems().size());

        // Return a 200 OK response wrapped in the standard ApiResponse format
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/analytics/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Gets statistics specific to a single warehouse.
     * 
     * @param warehouseId The ID of the warehouse to analyze.
     * @return A map of statistics including inventory counts, pending requests, and total inventory value.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWarehouseStats(@PathVariable Long warehouseId) {
        Map<String, Object> stats = new HashMap<>();
        
        // Count unique inventory items stored in this warehouse
        stats.put("totalInventoryItems", inventoryRepository.findByWarehouseId(warehouseId).size());
        
        // Count low stock items specifically in this warehouse
        stats.put("lowStockItems", inventoryRepository.findLowStockByWarehouseId(warehouseId).size());
        
        // Count pending stock requests sent to this specific warehouse
        stats.put("pendingRequests", stockRequestRepository.findPendingByWarehouseId(warehouseId).size());
        
        // Count active deliveries originating from this warehouse
        stats.put("activeDeliveries", deliveryRepository.findActiveByWarehouseId(warehouseId).size());
        
        // Count the number of supermarkets assigned to/serviced by this warehouse
        stats.put("supermarkets", supermarketRepository.findByWarehouseId(warehouseId).size());

        // Calculate total financial value of all inventory in this warehouse
        var inventoryItems = inventoryRepository.findByWarehouseId(warehouseId);
        double totalValue = inventoryItems.stream()
                // Map each inventory item to (Quantity * Unit Price)
                .mapToDouble(inv -> inv.getQuantity() * 
                        (inv.getProduct().getUnitPrice() != null ? inv.getProduct().getUnitPrice().doubleValue() : 0))
                // Sum all values together
                .sum();
        stats.put("totalInventoryValue", totalValue);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/analytics/supermarket/{supermarketId}
    // ─────────────────────────────────────────────────────────
    /**
     * Gets statistics specific to a single supermarket.
     * 
     * @param supermarketId The ID of the supermarket to analyze.
     * @return A map of statistics including inventory, deliveries, and recent sales performance.
     */
    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSupermarketStats(@PathVariable Long supermarketId) {
        Map<String, Object> stats = new HashMap<>();
        
        // Inventory and operational metrics for this supermarket
        stats.put("totalInventoryItems", inventoryRepository.findBySupermarketId(supermarketId).size());
        stats.put("lowStockItems", inventoryRepository.findLowStockBySupermarketId(supermarketId).size());
        
        // Find stock requests made by this supermarket that are currently PENDING
        stats.put("pendingRequests", stockRequestRepository.findBySupermarketId(supermarketId).stream()
                .filter(sr -> sr.getStatus().name().equals("PENDING")).count());
                
        // Active deliveries heading to this supermarket
        stats.put("activeDeliveries", deliveryRepository.findActiveBySupermarketId(supermarketId).size());

        // Get sales data for the last 30 days
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        var salesHistory = salesHistoryRepository.findBySupermarketAndDateRange(supermarketId, startDate, endDate);
        
        // Calculate total sales revenue over the last 30 days
        double totalSales = salesHistory.stream()
                .mapToDouble(sh -> sh.getTotalAmount() != null ? sh.getTotalAmount().doubleValue() : 0)
                .sum();
                
        stats.put("totalSales30Days", totalSales);
        stats.put("totalTransactions30Days", salesHistory.size());

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/analytics/inventory/summary
    // ─────────────────────────────────────────────────────────
    /**
     * Gets a system-wide summary of all inventory data.
     */
    @GetMapping("/inventory/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInventorySummary() {
        Map<String, Object> summary = new HashMap<>();
        
        // Fetch all inventory records globally
        var allInventory = inventoryRepository.findAll();
        // Fetch all low stock records globally
        var lowStock = inventoryRepository.findLowStockItems();
        
        // Total unique inventory records
        summary.put("totalItems", allInventory.size());
        
        // Total items low on stock
        summary.put("lowStockItems", lowStock.size());
        
        // Total sum of physical units across all products in all locations
        summary.put("totalQuantity", allInventory.stream().mapToInt(inv -> inv.getQuantity()).sum());
        
        // Total financial value of all inventory system-wide
        double totalValue = allInventory.stream()
                .mapToDouble(inv -> inv.getQuantity() * 
                        (inv.getProduct().getUnitPrice() != null ? inv.getProduct().getUnitPrice().doubleValue() : 0))
                .sum();
        summary.put("totalValue", totalValue);

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/analytics/requests/summary
    // ─────────────────────────────────────────────────────────
    /**
     * Gets a system-wide summary of stock requests, grouped by their status.
     */
    @GetMapping("/requests/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRequestsSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        var allRequests = stockRequestRepository.findAll();
        
        // Count total requests and break down by specific status enums
        summary.put("total", allRequests.size());
        summary.put("pending", allRequests.stream().filter(r -> r.getStatus().name().equals("PENDING")).count());
        summary.put("approved", allRequests.stream().filter(r -> r.getStatus().name().equals("APPROVED")).count());
        summary.put("rejected", allRequests.stream().filter(r -> r.getStatus().name().equals("REJECTED")).count());
        summary.put("completed", allRequests.stream().filter(r -> r.getStatus().name().equals("COMPLETED")).count());
        summary.put("inTransit", allRequests.stream().filter(r -> r.getStatus().name().equals("IN_TRANSIT")).count());

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/analytics/deliveries/summary
    // ─────────────────────────────────────────────────────────
    /**
     * Gets a system-wide summary of deliveries, grouped by their status.
     */
    @GetMapping("/deliveries/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeliveriesSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        var allDeliveries = deliveryRepository.findAll();
        
        // Count total deliveries and break down by specific status enums
        summary.put("total", allDeliveries.size());
        summary.put("pending", allDeliveries.stream().filter(d -> d.getStatus().name().equals("PENDING")).count());
        summary.put("dispatched", allDeliveries.stream().filter(d -> d.getStatus().name().equals("DISPATCHED")).count());
        summary.put("inTransit", allDeliveries.stream().filter(d -> d.getStatus().name().equals("IN_TRANSIT")).count());
        summary.put("delivered", allDeliveries.stream().filter(d -> d.getStatus().name().equals("DELIVERED")).count());
        summary.put("cancelled", allDeliveries.stream().filter(d -> d.getStatus().name().equals("CANCELLED")).count());

        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
