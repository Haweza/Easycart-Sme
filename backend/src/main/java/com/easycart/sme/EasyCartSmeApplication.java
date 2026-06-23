package com.easycart.sme;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // Required for InviteService.expireStaleInvites() @Scheduled job
public class EasyCartSmeApplication {
    public static void main(String[] args) {
        SpringApplication.run(EasyCartSmeApplication.class, args);
    }

    @Bean
    public CommandLineRunner databaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                System.out.println("Running check constraint migrations...");
                jdbcTemplate.execute("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;");
                jdbcTemplate.execute("ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'EXPIRED'::text]));");
                System.out.println("Check constraint migrations completed successfully.");
            } catch (Exception e) {
                System.err.println("Migration failed: " + e.getMessage());
            }
        };
    }
}
