package com.easycart.sme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // Required for InviteService.expireStaleInvites() @Scheduled job
public class EasyCartSmeApplication {
    public static void main(String[] args) {
        SpringApplication.run(EasyCartSmeApplication.class, args);
    }
}
