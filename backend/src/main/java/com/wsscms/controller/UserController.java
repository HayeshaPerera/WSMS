package com.wsscms.controller;

// Import DTOs for structured API communication
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.UserDTO;

// Import the service layer handling User-related business logic
import com.wsscms.service.UserService;

// Validation constraints
import jakarta.validation.Valid;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * UserController
 * 
 * Manages Employee/User accounts within the system.
 * Handles the CRUD operations for staff members (e.g., creating a new Supermarket Manager account).
 * 
 * Note: Authentication (login/logout) is handled in AuthController. 
 * This controller is strictly for user management (HR functions).
 */
@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {

    // Inject the user service which interacts with the UserRepository
    @Autowired
    private UserService userService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/users
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all user accounts in the system.
     * Security: ONLY a system Admin can view all users.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/users/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the profile of a specific user.
     * Security: An Admin can view ANY profile. A regular user can ONLY view their OWN profile.
     * The `@userSecurity.isCurrentUser(#id)` calls a custom Spring bean to check if the 
     * logged-in user's ID matches the {id} in the URL.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#id)")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable Long id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/users
    // ─────────────────────────────────────────────────────────
    /**
     * Creates a brand new user account (e.g., hiring a new warehouse worker).
     * Security: ONLY a system Admin can create new accounts.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDTO>> createUser(@Valid @RequestBody UserDTO userDTO) {
        UserDTO createdUser = userService.createUser(userDTO);
        return ResponseEntity.ok(ApiResponse.success("User created successfully", createdUser));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /api/v1/users/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Updates an existing user's profile (e.g., changing their name or email).
     * Security: Admin can update anyone. Regular users can only update themselves.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#id)")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(@PathVariable Long id, @Valid @RequestBody UserDTO userDTO) {
        UserDTO updatedUser = userService.updateUser(id, userDTO);
        return ResponseEntity.ok(ApiResponse.success("User updated successfully", updatedUser));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/v1/users/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Deletes a user account.
     * Security: ONLY an Admin can delete accounts.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/users/role/{roleName}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all users holding a specific role (e.g., "ROLE_SUPERMARKET_MANAGER").
     * Useful for assigning tasks or finding point-of-contacts.
     * Security: ONLY an Admin can list users by role.
     */
    @GetMapping("/role/{roleName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getUsersByRole(@PathVariable String roleName) {
        List<UserDTO> users = userService.getUsersByRole(roleName);
        return ResponseEntity.ok(ApiResponse.success(users));
    }
}
