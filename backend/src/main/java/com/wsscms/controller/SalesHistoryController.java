package com.wsscms.controller;

// Import DTOs for standardizing JSON communication
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.SalesHistoryDTO;

// Import Database Entities
import com.wsscms.entity.Product;
import com.wsscms.entity.SalesHistory;
import com.wsscms.entity.Supermarket;

// Import Repositories to interact with the MySQL database
import com.wsscms.repository.ProductRepository;
import com.wsscms.repository.SalesHistoryRepository;
import com.wsscms.repository.SupermarketRepository;

// Import standard Java exceptions and validation rules
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;

// Import Spring Web, Security, and Transaction annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

// Import standard Java utilities
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SalesHistoryController
 * 
 * Manages the recording and retrieval of point-of-sale (POS) data from Supermarkets.
 * This historical data is extremely important as it acts as the primary training data
 * for the AI Demand Forecasting microservice.
 */
@RestController
@RequestMapping("/api/v1/sales")
// @Transactional ensures that if any database operation fails inside these methods,
// the entire operation is rolled back to prevent corrupted/partial data.
@Transactional
@CrossOrigin(origins = "*", maxAge = 3600)
public class SalesHistoryController {

    // Inject required database repositories
    @Autowired
    private SalesHistoryRepository salesHistoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/sales
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all sales history globally.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getAllSales() {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/sales/product/{productId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all sales history for a specific product.
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getSalesByProduct(@PathVariable Long productId) {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findByProductId(productId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/sales/supermarket/{supermarketId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all sales history originating from a specific supermarket.
     */
    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getSalesBySupermarket(@PathVariable Long supermarketId) {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/sales/date-range
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves sales history within a specific time window.
     * Uses @DateTimeFormat to automatically parse string URLs into LocalDate.
     */
    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getSalesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findByDateRange(startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/sales
    // ─────────────────────────────────────────────────────────
    /**
     * Records a single new sales transaction. Usually called automatically by a POS system.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<SalesHistoryDTO>> recordSale(@Valid @RequestBody SalesHistoryDTO salesDTO) {
        SalesHistory sale = new SalesHistory();
        
        // 1. Verify product exists
        Product product = productRepository.findById(salesDTO.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        sale.setProduct(product);

        // 2. Verify supermarket exists
        Supermarket supermarket = supermarketRepository.findById(salesDTO.getSupermarketId())
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));
        sale.setSupermarket(supermarket);

        // 3. Set the date. If none provided in JSON, default to right now.
        sale.setSaleDate(salesDTO.getSaleDate() != null ? salesDTO.getSaleDate() : LocalDate.now());
        sale.setQuantitySold(salesDTO.getQuantitySold());
        
        // 4. Set price. If a specific discount price wasn't sent, use the product's master price.
        sale.setUnitPrice(salesDTO.getUnitPrice() != null ? salesDTO.getUnitPrice() : product.getUnitPrice());
        
        // 5. Calculate total = Quantity * UnitPrice
        sale.setTotalAmount(sale.getUnitPrice().multiply(java.math.BigDecimal.valueOf(sale.getQuantitySold())));
        sale.setNotes(salesDTO.getNotes());

        // 6. Save to DB and return the saved data
        SalesHistory savedSale = salesHistoryRepository.save(sale);
        return ResponseEntity.ok(ApiResponse.success("Sale recorded successfully", convertToDTO(savedSale)));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/sales/bulk
    // ─────────────────────────────────────────────────────────
    /**
     * Records multiple sales transactions at once.
     * Useful for importing end-of-day reports or CSV data from older legacy systems.
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> recordSalesBulk(@Valid @RequestBody List<SalesHistoryDTO> salesDTOList) {
        // Map the list of DTOs into a list of DB Entities
        List<SalesHistory> sales = salesDTOList.stream().map(dto -> {
            SalesHistory sale = new SalesHistory();
            Product product = productRepository.findById(dto.getProductId())
                    .orElseThrow(() -> new EntityNotFoundException("Product ID " + dto.getProductId() + " not found"));
            Supermarket supermarket = supermarketRepository.findById(dto.getSupermarketId())
                    .orElseThrow(() -> new EntityNotFoundException("Supermarket ID " + dto.getSupermarketId() + " not found"));
            sale.setProduct(product);
            sale.setSupermarket(supermarket);
            sale.setSaleDate(dto.getSaleDate() != null ? dto.getSaleDate() : LocalDate.now());
            sale.setQuantitySold(dto.getQuantitySold());
            sale.setUnitPrice(dto.getUnitPrice() != null ? dto.getUnitPrice() : product.getUnitPrice());
            sale.setTotalAmount(sale.getUnitPrice().multiply(java.math.BigDecimal.valueOf(sale.getQuantitySold())));
            sale.setNotes(dto.getNotes() != null ? dto.getNotes() : "Bulk Import");
            return sale;
        }).collect(Collectors.toList());

        // Use saveAll() for better database performance during bulk inserts
        List<SalesHistory> savedSales = salesHistoryRepository.saveAll(sales);
        
        // Convert saved entities back to DTOs for the JSON response
        List<SalesHistoryDTO> savedDTOs = savedSales.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(savedDTOs.size() + " sales records imported successfully", savedDTOs));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/sales/generate-demo
    // ─────────────────────────────────────────────────────────
    /**
     * A highly specialized endpoint used purely for demonstrating the AI Forecasting system.
     * It generates 'x' days of realistic, randomized historical sales data into the database
     * so that the Python AI has something to analyze during a Viva demonstration.
     * 
     * @param days How many days of history to fake (default 35)
     * @param supermarketId The supermarket to assign the fake sales to
     * @param clearExisting Whether to wipe old sales data before generating new data
     */
    @PostMapping("/generate-demo")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<String>> generateDemoSales(
            @RequestParam(defaultValue = "35") int days,
            @RequestParam(required = false) Long supermarketId,
            @RequestParam(defaultValue = "true") boolean clearExisting) {
        
        // Fallback to ID 1 if no supermarket specified
        Long targetSupermarketId = supermarketId;
        if (targetSupermarketId == null) {
            targetSupermarketId = 1L; 
        }

        Supermarket supermarket = supermarketRepository.findById(targetSupermarketId)
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));

        List<Product> products = productRepository.findByIsActiveTrue();
        if (products.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("No active products to generate sales for"));
        }

        LocalDate today = LocalDate.now();
        java.util.Random random = new java.util.Random();
        int recordsCreated = 0;

        // For every active product in the catalog...
        for (Product product : products) {
            
            // Clean old data if requested
            if (clearExisting) {
                List<SalesHistory> existing = salesHistoryRepository.findByProductAndSupermarket(product.getId(), supermarket.getId());
                if (!existing.isEmpty()) {
                    salesHistoryRepository.deleteAll(existing);
                }
            }

            // Loop backwards through time to generate daily sales
            for (int i = days; i >= 1; i--) {
                LocalDate saleDate = today.minusDays(i);
                int dayOfWeek = saleDate.getDayOfWeek().getValue();
                
                // Algorithm for realistic organic data:
                // 1. Base quantity of 4-9 items sold per day
                int baseQty = 4 + random.nextInt(6);
                
                // 2. Weekend multiplier (Fridays and Saturdays get a massive boost to simulate shopping habits)
                if (dayOfWeek >= 5) {
                    baseQty += 6 + random.nextInt(10); 
                }
                
                // 3. Drop days (10% chance of no sales at all on a given day to simulate stockouts/low foot traffic)
                if (random.nextDouble() < 0.1) {
                    continue;
                }

                // Create the fake record
                SalesHistory sale = new SalesHistory();
                sale.setProduct(product);
                sale.setSupermarket(supermarket);
                sale.setSaleDate(saleDate);
                sale.setQuantitySold(baseQty);
                sale.setUnitPrice(product.getUnitPrice());
                sale.setTotalAmount(product.getUnitPrice().multiply(java.math.BigDecimal.valueOf(baseQty)));
                sale.setNotes("Demo Simulated POS Transaction");

                salesHistoryRepository.save(sale);
                recordsCreated++;
            }
        }

        return ResponseEntity.ok(ApiResponse.success(recordsCreated + " simulated transactions successfully generated for " + products.size() + " products at " + supermarket.getName() + "!"));
    }

    // ─────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────
    /**
     * Helper method to map a SalesHistory JPA Entity into a flat JSON DTO structure.
     * Prevents infinite recursion issues common with Hibernate bi-directional relationships.
     */
    private SalesHistoryDTO convertToDTO(SalesHistory sale) {
        SalesHistoryDTO dto = new SalesHistoryDTO();
        dto.setId(sale.getId());
        dto.setSaleDate(sale.getSaleDate());
        dto.setQuantitySold(sale.getQuantitySold());
        dto.setUnitPrice(sale.getUnitPrice());
        dto.setTotalAmount(sale.getTotalAmount());
        dto.setNotes(sale.getNotes());

        if (sale.getProduct() != null) {
            dto.setProductId(sale.getProduct().getId());
            dto.setProductName(sale.getProduct().getName());
            dto.setProductSku(sale.getProduct().getSku());
        }

        if (sale.getSupermarket() != null) {
            dto.setSupermarketId(sale.getSupermarket().getId());
            dto.setSupermarketName(sale.getSupermarket().getName());
        }

        return dto;
    }
}
