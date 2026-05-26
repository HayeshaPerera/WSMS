import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckDB {
    public static void main(String[] args) {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/wsscms_db", "wsscms_user", "newpassword");
             Statement stmt = conn.createStatement()) {
            
            System.out.println("--- Users ---");
            ResultSet rs = stmt.executeQuery("SELECT username, password_hash FROM users");
            while (rs.next()) {
                System.out.println(rs.getString("username") + " : " + rs.getString("password_hash"));
            }
            
            System.out.println("--- Flyway History ---");
            rs = stmt.executeQuery("SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5");
            while (rs.next()) {
                System.out.println(rs.getString("version") + " - " + rs.getString("description") + " : " + rs.getBoolean("success"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
