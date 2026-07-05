package com.wsscms.controller;

// Import DTOs to standardize JSON request/response formats
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.ProductDTO;

// Import the service layer containing business logic for products
import com.wsscms.service.ProductService;

// Import Jakarta Validation to enforce rules (like @NotBlank) on incoming JSON payloads
import jakarta.validation.Valid;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ProductController
 * 
 * Manages the global master catalog of Products.
 * A "Product" here defines the item itself (SKU, Name, Price, Category) 
 * but does NOT represent physical inventory quantities.
 */
@RestController
@RequestMapping("/api/v1/products")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProductController {

    // Inject the ProductService for database operations
    @Autowired
    private ProductService productService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products/available-in-warehouses
    // ─────────────────────────────────────────────────────────
    /**
     * Special endpoint used by Supermarkets when creating a Stock Request.
     * It only returns products that currently have a physical quantity > 0
     * in at least one warehouse, preventing supermarkets from requesting
     * items that are completely out of stock system-wide.
     * 
     * Note: This mapping is explicitly placed BEFORE the "/{id}" mapping
     * to prevent Spring from confusing the string "available-in-warehouses" with a dynamic ID.
     */
    @GetMapping("/available-in-warehouses")
    public ResponseEntity<ApiResponse<List<ProductDTO>>> getProductsAvailableInWarehouses() {
        List<ProductDTO> products = productService.getProductsAvailableInWarehouses();
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the entire product catalog, including inactive/discontinued products.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductDTO>>> getAllProducts() {
        List<ProductDTO> products = productService.getAllProducts();
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products/active
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves only currently active products that can be ordered and sold.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductDTO>>> getActiveProducts() {
        List<ProductDTO> products = productService.getActiveProducts();
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products/category/{category}
    // ─────────────────────────────────────────────────────────
    /**
     * Filters the product catalog by category (e.g., "Dairy", "Produce").
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<ProductDTO>>> getProductsByCategory(@PathVariable String category) {
        List<ProductDTO> products = productService.getProductsByCategory(category);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products/search
    // ─────────────────────────────────────────────────────────
    /**
     * Performs a substring search on the product name.
     * Used by autocomplete dropdowns in the frontend.
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ProductDTO>>> searchProducts(@RequestParam String name) {
        List<ProductDTO> products = productService.searchProducts(name);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the details of a single product by its database ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductDTO>> getProductById(@PathVariable Long id) {
        ProductDTO product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/products/sku/{sku}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the details of a single product by its unique Stock Keeping Unit (SKU) code.
     * Commonly used by barcode scanners.
     */
    @GetMapping("/sku/{sku}")
    public ResponseEntity<ApiResponse<ProductDTO>> getProductBySku(@PathVariable String sku) {
        ProductDTO product = productService.getProductBySku(sku);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/products
    // ─────────────────────────────────────────────────────────
    /**
     * Creates a new product in the master catalog.
     * Role Restriction: Only Admins or Warehouse staff can define new products.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<ProductDTO>> createProduct(@Valid @RequestBody ProductDTO productDTO) {
        ProductDTO createdProduct = productService.createProduct(productDTO);
        return ResponseEntity.ok(ApiResponse.success("Product created successfully", createdProduct));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /api/v1/products/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Updates an existing product's details (like price changes, category changes).
     * Role Restriction: Only Admins or Warehouse staff.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<ProductDTO>> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductDTO productDTO) {
        ProductDTO updatedProduct = productService.updateProduct(id, productDTO);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", updatedProduct));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/v1/products/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Deletes a product from the catalog. 
     * Usually, it's safer to mark a product as inactive rather than deleting it, 
     * as deleting breaks foreign keys in historical sales data.
     * Role Restriction: ONLY Super Admins can hard-delete products.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }
}
