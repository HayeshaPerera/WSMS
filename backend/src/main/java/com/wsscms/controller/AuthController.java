
package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.JwtResponse;
import com.wsscms.dto.LoginRequest;
import com.wsscms.entity.User;
import com.wsscms.repository.UserRepository;
import com.wsscms.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    public static void main(String[] args) {
        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        String hash = encoder.encode("password");
        System.out.println("BCrypt hash for 'password': " + hash);
    }
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtUtils jwtUtils;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        User user = userRepository.findByUsername(loginRequest.getUsername()).orElse(null);
        System.out.println("[DEBUG] Received username: [" + loginRequest.getUsername() + "] password: [" + loginRequest.getPassword() + "]");
        if (user != null) {
            String password = loginRequest.getPassword();
            String hash = user.getPasswordHash();
            System.out.println("[DEBUG] Password for BCrypt: [" + password + "]");
            System.out.println("[DEBUG] Hash for BCrypt: [" + hash + "]");
            System.out.println("[DEBUG] Hash length: " + (hash != null ? hash.length() : "null"));
            System.out.print("[DEBUG] Hash bytes: [");
            if (hash != null) {
                for (byte b : hash.getBytes()) {
                    System.out.print(b + " ");
                }
            }
            System.out.println("]");
            System.out.println("[DEBUG] passwordEncoder class: " + passwordEncoder.getClass().getName());
            System.out.println("[DEBUG] BCrypt matches: " + passwordEncoder.matches(password, hash));
        }
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            JwtResponse response = JwtResponse.builder()
                    .token(jwt)
                    .type("Bearer")
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .roles(user.getRoles().stream().map(role -> role.getName()).collect(Collectors.toList()))
                    .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                    .supermarketId(user.getSupermarket() != null ? user.getSupermarket().getId() : null)
                    .build();
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid username or password"));
        }
    }
}
