package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.JwtResponse;
import com.wsscms.dto.LoginRequest;
import com.wsscms.dto.RefreshRequest;
import com.wsscms.entity.RefreshToken;
import com.wsscms.entity.User;
import com.wsscms.repository.UserRepository;
import com.wsscms.security.JwtUtils;
import com.wsscms.service.RefreshTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "Authentication", description = "Login, token refresh, and logout")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtils jwtUtils;
    @Autowired private RefreshTokenService refreshTokenService;

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/auth/login
    // ─────────────────────────────────────────────────────────
    @PostMapping("/login")
    @Operation(summary = "Authenticate user — returns accessToken + refreshToken")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String accessToken  = jwtUtils.generateTokenFromUsername(user.getUsername());
            RefreshToken refresh = refreshTokenService.createRefreshToken(user.getId());

            JwtResponse response = JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refresh.getToken())
                    .type("Bearer")
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .roles(user.getRoles().stream()
                            .map(role -> role.getName())
                            .collect(Collectors.toList()))
                    .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                    .supermarketId(user.getSupermarket() != null ? user.getSupermarket().getId() : null)
                    .build();

            logger.info("User '{}' logged in", user.getUsername());
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));

        } catch (Exception e) {
            logger.warn("Failed login attempt for '{}'", loginRequest.getUsername());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid username or password"));
        }
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/auth/refresh
    // ─────────────────────────────────────────────────────────
    @PostMapping("/refresh")
    @Operation(summary = "Exchange a valid refresh token for a new access token")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        return refreshTokenService.findAndValidate(request.getRefreshToken())
                .map(rt -> {
                    String newAccessToken = jwtUtils.generateTokenFromUsername(
                            rt.getUser().getUsername());
                    return ResponseEntity.ok(ApiResponse.success("Token refreshed",
                            JwtResponse.builder()
                                    .accessToken(newAccessToken)
                                    .refreshToken(rt.getToken()) // same refresh token
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
                .orElseGet(() -> ResponseEntity.status(401)
                        .body(ApiResponse.error("Refresh token is invalid or expired. Please log in again.")));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/auth/logout
    // ─────────────────────────────────────────────────────────
    @PostMapping("/logout")
    @Operation(summary = "Revoke all refresh tokens for the authenticated user")
    public ResponseEntity<?> logout(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails != null) {
            userRepository.findByUsername(userDetails.getUsername())
                    .ifPresent(user -> {
                        refreshTokenService.revokeAllForUser(user);
                        logger.info("User '{}' logged out — refresh tokens revoked", user.getUsername());
                    });
        }
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }
}
