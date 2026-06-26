package com.easycart.sme.service;

import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class SupabaseAuthService {

    private final OkHttpClient client;
    private final String supabaseUrl;
    private final String anonKey;
    private final ObjectMapper objectMapper;

    public SupabaseAuthService(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.anon-key}") String anonKey) {
        this.client = new OkHttpClient();
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
        this.objectMapper = new ObjectMapper();
    }

    public void sendResetPasswordEmail(String email) {
        String url = supabaseUrl + "/auth/v1/recover";
        
        try {
            Map<String, String> bodyMap = Map.of("email", email);
            String json = objectMapper.writeValueAsString(bodyMap);
            RequestBody body = RequestBody.create(json, MediaType.get("application/json"));

            Request request = new Request.Builder()
                    .url(url)
                    .post(body)
                    .addHeader("apikey", anonKey)
                    .addHeader("Content-Type", "application/json")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "";
                    log.error("Supabase recover failed: status={}, body={}", response.code(), errorBody);
                    throw new RuntimeException("Failed to send reset link via Supabase: " + errorBody);
                }
            }
        } catch (IOException e) {
            log.error("Network error calling Supabase recover", e);
            throw new RuntimeException("Connection to authentication server failed.");
        }
    }

    public void updateUserPassword(String accessToken, String newPassword) {
        String url = supabaseUrl + "/auth/v1/user";

        try {
            Map<String, String> bodyMap = Map.of("password", newPassword);
            String json = objectMapper.writeValueAsString(bodyMap);
            RequestBody body = RequestBody.create(json, MediaType.get("application/json"));

            Request request = new Request.Builder()
                    .url(url)
                    .put(body)
                    .addHeader("apikey", anonKey)
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .addHeader("Content-Type", "application/json")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "";
                    log.error("Supabase user update failed: status={}, body={}", response.code(), errorBody);
                    throw new RuntimeException("Failed to update password: " + errorBody);
                }
            }
        } catch (IOException e) {
            log.error("Network error calling Supabase user update", e);
            throw new RuntimeException("Connection to authentication server failed.");
        }
    }
}
