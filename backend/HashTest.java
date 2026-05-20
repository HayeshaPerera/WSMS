import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
public class HashTest {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = "$2a$10$wT0oA8H.H.N/F/sQxO7p.O1qP6g9/6Yt8WzVj90yP3/Hw5e7ZgNRe";
        System.out.println("Matches Admin@123: " + encoder.matches("Admin@123", hash));
        System.out.println("Matches password: " + encoder.matches("password", hash));
        System.out.println("Hash for Admin@123: " + encoder.encode("Admin@123"));
    }
}
