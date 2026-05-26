package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.SalesHistoryDTO;
import com.wsscms.entity.Product;
import com.wsscms.entity.SalesHistory;
import com.wsscms.entity.Supermarket;
import com.wsscms.repository.ProductRepository;
import com.wsscms.repository.SalesHistoryRepository;
import com.wsscms.repository.SupermarketRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/sales")
@Transactional
@CrossOrigin(origins = "*", maxAge = 3600)
public class SalesHistoryController {

    @Autowired
    private SalesHistoryRepository salesHistoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getAllSales() {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getSalesByProduct(@PathVariable Long productId) {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findByProductId(productId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getSalesBySupermarket(@PathVariable Long supermarketId) {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> getSalesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<SalesHistoryDTO> sales = salesHistoryRepository.findByDateRange(startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<SalesHistoryDTO>> recordSale(@Valid @RequestBody SalesHistoryDTO salesDTO) {
        SalesHistory sale = new SalesHistory();
        
        Product product = productRepository.findById(salesDTO.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        sale.setProduct(product);

        Supermarket supermarket = supermarketRepository.findById(salesDTO.getSupermarketId())
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));
        sale.setSupermarket(supermarket);

        sale.setSaleDate(salesDTO.getSaleDate() != null ? salesDTO.getSaleDate() : LocalDate.now());
        sale.setQuantitySold(salesDTO.getQuantitySold());
        sale.setUnitPrice(salesDTO.getUnitPrice() != null ? salesDTO.getUnitPrice() : product.getUnitPrice());
        sale.setTotalAmount(sale.getUnitPrice().multiply(java.math.BigDecimal.valueOf(sale.getQuantitySold())));
        sale.setNotes(salesDTO.getNotes());

        SalesHistory savedSale = salesHistoryRepository.save(sale);
        return ResponseEntity.ok(ApiResponse.success("Sale recorded successfully", convertToDTO(savedSale)));
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<List<SalesHistoryDTO>>> recordSalesBulk(@Valid @RequestBody List<SalesHistoryDTO> salesDTOList) {
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

        List<SalesHistory> savedSales = salesHistoryRepository.saveAll(sales);
        List<SalesHistoryDTO> savedDTOs = savedSales.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(savedDTOs.size() + " sales records imported successfully", savedDTOs));
    }

    @PostMapping("/generate-demo")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<String>> generateDemoSales(
            @RequestParam(defaultValue = "35") int days,
            @RequestParam(required = false) Long supermarketId) {
        
        Long targetSupermarketId = supermarketId;
        if (targetSupermarketId == null) {
            targetSupermarketId = 1L; // Fallback to store 1
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

        for (Product product : products) {
            // Clean old sales history for this product/supermarket first to keep database clean
            List<SalesHistory> existing = salesHistoryRepository.findByProductAndSupermarket(product.getId(), supermarket.getId());
            if (!existing.isEmpty()) {
                salesHistoryRepository.deleteAll(existing);
            }

            for (int i = days; i >= 1; i--) {
                LocalDate saleDate = today.minusDays(i);
                int dayOfWeek = saleDate.getDayOfWeek().getValue();
                
                // Realistic seasonal wave: base weekly quantity + random variation + weekend boost
                int baseQty = 4 + random.nextInt(6);
                if (dayOfWeek >= 5) {
                    baseQty += 6 + random.nextInt(10); // weekend spike
                }
                
                // Introduce random outliers/drop days
                if (random.nextDouble() < 0.1) {
                    continue; // 10% chance of no sales recorded for this product on this day
                }

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
