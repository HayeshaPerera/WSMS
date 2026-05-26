package com.wsscms;

import com.wsscms.entity.User;
import com.wsscms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Component
public class PasswordFixer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(PasswordFixer.class);
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordFixer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("--- Fixing user passwords ---");
        List<User> users = userRepository.findAll();
        String properHash = passwordEncoder.encode("password");
        for (User user : users) {
            user.setPasswordHash(properHash);
            userRepository.save(user);
        }
        logger.info("--- Fixed {} users to have password 'password' ---", users.size());
    }
}
