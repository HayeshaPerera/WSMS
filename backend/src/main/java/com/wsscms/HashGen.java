package com.wsscms;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
public class HashGen {
    public static void main(String[] args) {
        System.out.println("HASH_IS:" + new BCryptPasswordEncoder().encode("password"));
    }
}
