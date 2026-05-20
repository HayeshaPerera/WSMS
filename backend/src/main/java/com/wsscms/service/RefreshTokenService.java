package com.wsscms.service;

import com.wsscms.entity.RefreshToken;
import com.wsscms.entity.User;
import com.wsscms.repository.RefreshTokenRepository;
import com.wsscms.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               UserRepository userRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    /** Create and persist a new refresh token for the given user. */
    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Revoke any existing tokens for this user (single-session policy)
        refreshTokenRepository.revokeAllByUser(user);

        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(token);
    }

    /** Validate a refresh token: exists, not revoked, not expired. */
    public Optional<RefreshToken> findAndValidate(String token) {
        return refreshTokenRepository.findByToken(token)
                .filter(rt -> !rt.getRevoked())
                .filter(rt -> rt.getExpiryDate().isAfter(Instant.now()));
    }

    /** Revoke all tokens for a user (logout). */
    @Transactional
    public void revokeAllForUser(User user) {
        refreshTokenRepository.revokeAllByUser(user);
    }

    /** Scheduled cleanup — call from a @Scheduled task if desired. */
    @Transactional
    public void cleanExpiredTokens() {
        refreshTokenRepository.deleteExpiredAndRevoked(Instant.now());
    }
}
