package com.wsscms.config;

import com.wsscms.security.AuthEntryPointJwt;
import com.wsscms.security.JwtAuthenticationFilter;
import com.wsscms.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * SecurityConfig
 * 
 * This is the central security configuration class for the Spring Boot application.
 * It configures web security settings including CORS, CSRF, JWT filters, authentication providers,
 * session management, and URL authorization rules.
 */
@Configuration
@EnableWebSecurity // Enables Spring Security web security support
@EnableMethodSecurity // Enables method-level security annotations like @PreAuthorize on controller methods
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService; // Service to load user details from the database

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler; // Handles unauthorized access exceptions (returns 401 Unauthorized)

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter; // Custom filter to intercept requests and validate JWT tokens

    /**
     * Configures the DaoAuthenticationProvider bean, which is responsible for fetching
     * user details and verifying passwords using the configured password encoder.
     */
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService); // Link custom service to load user info
        authProvider.setPasswordEncoder(passwordEncoder()); // Link password encoder (BCrypt)
        return authProvider;
    }

    /**
     * Exposes the AuthenticationManager bean, which orchestrates the authentication flow.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * Configures the password encoder bean.
     * Uses BCrypt hashing algorithm to securely hash and compare user passwords.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configures Cross-Origin Resource Sharing (CORS) rules.
     * Allows the frontend (or other services) to make REST requests to this backend.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowCredentials(true); // Allow sending credentials like cookies or auth headers
        configuration.addAllowedOriginPattern("*"); // Allow all origins to connect
        configuration.addAllowedHeader("*"); // Allow all headers in requests
        configuration.addAllowedMethod("*"); // Allow all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
        configuration.setExposedHeaders(List.of("Authorization")); // Expose Authorization header to the client
        configuration.setMaxAge(3600L); // Cache CORS preflight responses for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Apply these CORS rules to all endpoints
        return source;
    }

    /**
     * Defines the primary security filter chain which intercepts HTTP requests.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. Disable CSRF (Cross-Site Request Forgery) since REST APIs using JWTs are stateless
            .csrf(csrf -> csrf.disable())
            
            // 2. Enable CORS with default settings (loads the corsConfigurationSource bean defined above)
            .cors(Customizer.withDefaults())
            
            // 3. Configure error handling for authentication entry point (unauthorized access)
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            
            // 4. Configure session management to be stateless (no server-side HTTP session storage)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 5. Define URL endpoint authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Allow all HTTP OPTIONS preflight checks
                .requestMatchers("/api/v1/auth/**").permitAll() // Allow everyone to access authentication endpoints (login/register)
                .requestMatchers("/api/public/**").permitAll() // Allow everyone to access public utility API paths
                .requestMatchers("/actuator/**").permitAll() // Allow access to system health and metrics (Spring Boot Actuator)
                .requestMatchers("/error").permitAll() // Allow access to standard error views
                .anyRequest().authenticated() // All other requests MUST be authenticated (require a valid JWT token)
            );

        // Link the authentication provider configured above
        http.authenticationProvider(authenticationProvider());
        
        // Add our custom JWT filter before the standard UsernamePasswordAuthenticationFilter
        // This ensures the JWT is verified first and populates security context for subsequent checks
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
