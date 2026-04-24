package com.easycart.sme.controller;

import com.easycart.sme.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ServiceRepository serviceRepository;

    /**
     * GET /api/services — Public. Returns all active services.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listActive() {
        var services = serviceRepository.findByIsActiveTrue();
        var result = services.stream().map(s -> Map.<String, Object>of(
                "id",           s.getId().toString(),
                "name",         s.getName(),
                "description",  s.getDescription() != null ? s.getDescription() : "",
                "plans",        s.getPlans().stream().filter(com.easycart.sme.entity.Plan::getIsActive).map(p -> Map.of(
                        "id", p.getId().toString(),
                        "name", p.getName(),
                        "price", p.getPrice(),
                        "currency", p.getCurrency()
                )).toList()
        )).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/services/{id} — Public. Single service detail.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable UUID id) {
        var s = serviceRepository.findById(id)
                .orElseThrow(() -> new com.easycart.sme.exception.NotFoundException("Service not found"));
        return ResponseEntity.ok(Map.<String, Object>of(
                "id",           s.getId().toString(),
                "name",         s.getName(),
                "description",  s.getDescription() != null ? s.getDescription() : "",
                "plans",        s.getPlans().stream().filter(com.easycart.sme.entity.Plan::getIsActive).map(p -> Map.of(
                        "id", p.getId().toString(),
                        "name", p.getName(),
                        "price", p.getPrice(),
                        "currency", p.getCurrency()
                )).toList()
        ));
    }
}
