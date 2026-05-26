import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateHashes {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("admin123: " + encoder.encode("admin123"));
        System.out.println("warehouse123: " + encoder.encode("warehouse123"));
        System.out.println("staff123: " + encoder.encode("staff123"));
        System.out.println("supermarket123: " + encoder.encode("supermarket123"));
    }
}
