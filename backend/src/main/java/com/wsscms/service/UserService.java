package com.wsscms.service;

import com.wsscms.dto.UserDTO;
import com.wsscms.entity.Role;
import com.wsscms.entity.Supermarket;
import com.wsscms.entity.User;
import com.wsscms.entity.Warehouse;
import com.wsscms.repository.RoleRepository;
import com.wsscms.repository.SupermarketRepository;
import com.wsscms.repository.UserRepository;
import com.wsscms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
        return convertToDTO(user);
    }

    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found with username: " + username));
        return convertToDTO(user);
    }

    public UserDTO createUser(UserDTO userDTO) {
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User();
        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        user.setPasswordHash(passwordEncoder.encode(userDTO.getPassword()));
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setPhone(userDTO.getPhone());
        user.setActive(userDTO.getActive() != null ? userDTO.getActive() : true);

        // Set roles
        if (userDTO.getRoles() != null && !userDTO.getRoles().isEmpty()) {
            Set<Role> roles = new HashSet<>();
            for (String roleName : userDTO.getRoles()) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleName));
                roles.add(role);
            }
            user.setRoles(roles);
        }

        // Set warehouse
        if (userDTO.getWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(userDTO.getWarehouseId())
                    .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
            user.setWarehouse(warehouse);
        }

        // Set supermarket
        if (userDTO.getSupermarketId() != null) {
            Supermarket supermarket = supermarketRepository.findById(userDTO.getSupermarketId())
                    .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));
            user.setSupermarket(supermarket);
        }

        User savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }

    public UserDTO updateUser(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));

        if (!user.getUsername().equals(userDTO.getUsername()) && 
            userRepository.existsByUsername(userDTO.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (!user.getEmail().equals(userDTO.getEmail()) && 
            userRepository.existsByEmail(userDTO.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setPhone(userDTO.getPhone());
        
        if (userDTO.getActive() != null) {
            user.setActive(userDTO.getActive());
        }

        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Update roles
        if (userDTO.getRoles() != null) {
            Set<Role> roles = new HashSet<>();
            for (String roleName : userDTO.getRoles()) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleName));
                roles.add(role);
            }
            user.setRoles(roles);
        }

        // Update warehouse
        if (userDTO.getWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(userDTO.getWarehouseId())
                    .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
            user.setWarehouse(warehouse);
        } else {
            user.setWarehouse(null);
        }

        // Update supermarket
        if (userDTO.getSupermarketId() != null) {
            Supermarket supermarket = supermarketRepository.findById(userDTO.getSupermarketId())
                    .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));
            user.setSupermarket(supermarket);
        } else {
            user.setSupermarket(null);
        }

        User updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    public List<UserDTO> getUsersByRole(String roleName) {
        return userRepository.findByRoleName(roleName).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        dto.setActive(user.getActive());
        
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream()
                    .map(Role::getName)
                    .collect(Collectors.toSet()));
        }
        
        if (user.getWarehouse() != null) {
            dto.setWarehouseId(user.getWarehouse().getId());
            dto.setWarehouseName(user.getWarehouse().getName());
        }
        
        if (user.getSupermarket() != null) {
            dto.setSupermarketId(user.getSupermarket().getId());
            dto.setSupermarketName(user.getSupermarket().getName());
        }
        
        return dto;
    }
}
