package com.easycart.sme.service;

import com.easycart.sme.entity.ActivityLog;
import com.easycart.sme.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    /**
     * Save activity log entry
     */
    /**
     * Log an activity with an optional resource reference (promo, subscription, request, etc.)
     */
    @Transactional
    public void logActivity(
            String actorName,
            String action,
            String description,
            String resourceId
    ) {
        ActivityLog log = ActivityLog.builder()
                .actorId(null)
                .actorName(actorName)
                .action(action)
                .description(description)
                .referenceId(parseUUID(resourceId))
                .build();

        activityLogRepository.save(log);
    }

    /**
     * Log a family-specific activity (e.g. ADD_MEMBER, REMOVE_MEMBER)
     */
    @Transactional
    public void logFamilyActivity(
            String actorName,
            String action,
            String description,
            UUID familyId
    ) {
        ActivityLog log = ActivityLog.builder()
                .actorId(null)
                .actorName(actorName)
                .action(action)
                .description(description)
                .familyId(familyId)
                .build();

        activityLogRepository.save(log);
    }

    /**
     * Get all activity logs
     */
    @Transactional(readOnly = true)
    public List<ActivityLog> getAllLogs() {
        return activityLogRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Get logs for family ids
     */
    @Transactional(readOnly = true)
    public List<ActivityLog> getFamilyLogs(List<UUID> familyIds) {
        return activityLogRepository
                .findByFamilyIdInOrderByCreatedAtDesc(familyIds);
    }

    /**
     * Safely convert string → UUID
     */
    private UUID parseUUID(String value) {
        try {
            return value != null
                    ? UUID.fromString(value)
                    : null;
        } catch (Exception e) {
            return null;
        }
    }
}