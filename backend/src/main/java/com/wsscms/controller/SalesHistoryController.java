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

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/sales")
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
