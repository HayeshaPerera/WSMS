package com.wsscms.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "password123";
        String encodedPassword = encoder.encode(rawPassword);
        System.out.println("BCrypt hash for '" + rawPassword + "':");
        System.out.println(encodedPassword);
        
        // Verify the hash
        System.out.println("Verification: " + encoder.matches(rawPassword, encodedPassword));
    }
}
