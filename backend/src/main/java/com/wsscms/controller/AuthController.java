package com.wsscms.controller;

// Import Data Transfer Objects (DTOs) used for structuring API requests and responses
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.JwtResponse;
import com.wsscms.dto.LoginRequest;
import com.wsscms.dto.RefreshRequest;

// Import database entities
import com.wsscms.entity.RefreshToken;
import com.wsscms.entity.User;

// Import the repository for database access to user records
import com.wsscms.repository.UserRepository;

// Import JWT utility class which contains logic to generate and validate JSON Web Tokens
import com.wsscms.security.JwtUtils;

// Import service that handles refresh token creation, validation, and revocation
import com.wsscms.service.RefreshTokenService;

// Import Swagger/OpenAPI annotations for auto-generating API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// Import Jakarta validation annotations (used to ensure request payloads are valid before processing)
import jakarta.validation.Valid;

// Import SLF4J for logging events to the console/file
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Import Spring framework annotations and classes
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

/**
 * AuthController
 * 
 * Handles all authentication-related API endpoints:
 * 1. Login (generating access & refresh tokens)
 * 2. Token Refresh (exchanging a valid refresh token for a new access token)
 * 3. Logout (revoking refresh tokens)
 * 
 * It is marked with @RestController which tells Spring that this class contains 
 * request handler methods and the responses should automatically be serialized into JSON.
 */
@RestController
// Base URL path for all endpoints in this controller
@RequestMapping("/api/v1/auth")
// Allow cross-origin requests from any domain (CORS configuration)
@CrossOrigin(origins = "*", maxAge = 3600)
// Swagger UI tag for grouping these endpoints in the generated API docs
@Tag(name = "Authentication", description = "Login, token refresh, and logout")
public class AuthController {

    // Initialize the logger for this specific class
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    // Inject the AuthenticationManager (configured in SecurityConfig) to handle password verification
    @Autowired private AuthenticationManager authenticationManager;
    
    // Inject UserRepository to fetch user details from the database
    @Autowired private UserRepository userRepository;
    
    // Inject JwtUtils which contains the logic for creating JWT strings
    @Autowired private JwtUtils jwtUtils;
    
    // Inject RefreshTokenService to manage long-lived refresh tokens in the database
    @Autowired private RefreshTokenService refreshTokenService;

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/auth/login
    // ─────────────────────────────────────────────────────────
    /**
     * Authenticates a user based on username and password.
     * 
     * @param loginRequest DTO containing username and password. @Valid ensures fields aren't empty.
     * @return A ResponseEntity containing the JWT tokens and user details if successful, or an error message if failed.
     */
    @PostMapping("/login")
    @Operation(summary = "Authenticate user — returns accessToken + refreshToken")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Attempt to authenticate the user using Spring Security's AuthenticationManager.
            // This will hash the provided password and compare it against the hash stored in the DB.
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(), loginRequest.getPassword()));

            // If authentication succeeds, store the authentication object in the SecurityContext.
            // This makes the user "logged in" for the duration of this specific thread/request.
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Extract the UserDetails object which was populated during the authentication process
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            
            // Fetch the full User entity from the database to get extra fields (ID, roles, warehouse, etc.)
            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Generate a short-lived JSON Web Token (JWT) using the username
            String accessToken  = jwtUtils.generateTokenFromUsername(user.getUsername());
            
            // Generate and save a long-lived Refresh Token in the database for this user
            RefreshToken refresh = refreshTokenService.createRefreshToken(user.getId());

            // Build the standard response payload containing tokens and user information
            JwtResponse response = JwtResponse.builder()
                    .accessToken(accessToken)            // The short-lived token for API requests
                    .refreshToken(refresh.getToken())    // The long-lived token to get new access tokens
                    .type("Bearer")                      // The token type standard
                    .id(user.getId())                    // User's database ID
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    // Extract role names from the user's role entities and convert to a list of strings
                    .roles(user.getRoles().stream()
                            .map(role -> role.getName())
                            .collect(Collectors.toList()))
                    // Include Warehouse ID if the user is assigned to one
                    .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                    // Include Supermarket ID if the user is assigned to one
                    .supermarketId(user.getSupermarket() != null ? user.getSupermarket().getId() : null)
                    .build();

            // Log the successful login event
            logger.info("User '{}' logged in", user.getUsername());
            
            // Return a 200 OK HTTP response with the structured success payload
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));

        } catch (Exception e) {
            // If authenticationManager.authenticate() fails (wrong password, user disabled, etc.), it throws an exception.
            // We catch it here and log a warning.
            logger.warn("Failed login attempt for '{}'", loginRequest.getUsername());
            
            // Return a 400 Bad Request HTTP response with a generic error message (security best practice)
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid username or password"));
        }
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/auth/refresh
    // ─────────────────────────────────────────────────────────
    /**
     * Takes a Refresh Token and, if valid, returns a new Access Token.
     * This prevents the user from having to log in again when their short-lived access token expires.
     * 
     * @param request DTO containing the string value of the refresh token
     * @return A ResponseEntity with a new access token, or a 401 Unauthorized if the refresh token is invalid.
     */
    @PostMapping("/refresh")
    @Operation(summary = "Exchange a valid refresh token for a new access token")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        // 1. Find the refresh token in the database
        // 2. Validate that it hasn't expired yet
        return refreshTokenService.findAndValidate(request.getRefreshToken())
                .map(rt -> {
                    // If the token is found and valid, generate a brand new access token for the associated user
                    String newAccessToken = jwtUtils.generateTokenFromUsername(
                            rt.getUser().getUsername());
                            
                    // Return a 200 OK response with the new token and the user's current data
                    return ResponseEntity.ok(ApiResponse.success("Token refreshed",
                            JwtResponse.builder()
                                    .accessToken(newAccessToken) // The brand new token
                                    .refreshToken(rt.getToken()) // We return the same refresh token, it is still valid
                                    .type("Bearer")
                                    .id(rt.getUser().getId())
                                    .username(rt.getUser().getUsername())
                                    .email(rt.getUser().getEmail())
                                    .roles(rt.getUser().getRoles().stream()
                                            .map(r -> r.getName())
                                            .collect(Collectors.toList()))
                                    .warehouseId(rt.getUser().getWarehouse() != null
                                            ? rt.getUser().getWarehouse().getId() : null)
                                    .supermarketId(rt.getUser().getSupermarket() != null
                                            ? rt.getUser().getSupermarket().getId() : null)
                                    .build()));
                })
                // If the token was NOT found in the DB, or if it WAS found but expired, return a 401 response
                .orElseGet(() -> ResponseEntity.status(401)
                        .body(ApiResponse.error("Refresh token is invalid or expired. Please log in again.")));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/auth/logout
    // ─────────────────────────────────────────────────────────
    /**
     * Logs out the user by revoking all of their active refresh tokens in the database.
     * Note: Short-lived JWT access tokens cannot be easily invalidated, but they expire quickly.
     * By deleting the refresh token, we ensure the user must log in again once the access token expires.
     * 
     * @param userDetails The currently authenticated user (injected automatically by Spring Security)
     * @return A success message
     */
    @PostMapping("/logout")
    @Operation(summary = "Revoke all refresh tokens for the authenticated user")
    public ResponseEntity<?> logout(@AuthenticationPrincipal UserDetails userDetails) {
        // Ensure the user is actually authenticated
        if (userDetails != null) {
            // Find the full user entity in the database
            userRepository.findByUsername(userDetails.getUsername())
                    .ifPresent(user -> {
                        // Delete all refresh tokens associated with this user ID from the database
                        refreshTokenService.revokeAllForUser(user);
                        
                        // Log the logout event
                        logger.info("User '{}' logged out — refresh tokens revoked", user.getUsername());
                    });
        }
        
        // Return a 200 OK response. We return success even if the user wasn't fully authenticated 
        // to prevent leaking information about session state.
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }
}
