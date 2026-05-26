-- Update all users to have the password 'password' with a known valid Spring Security BCrypt hash
UPDATE users SET password_hash = '$2a$10$rCUJpXXRuj2c9SjTOmuo3uvQ80EyPrAy4wzbyFj7RiMqjSEjayGEm';
