-- ==========================================
-- 1. DELETE EXISTING DATA (In correct order to avoid Foreign Key errors)
-- ==========================================
DELETE FROM service_requests;
DELETE FROM invites;
DELETE FROM family_members;
DELETE FROM families;
DELETE FROM plans;
DELETE FROM services;

-- ==========================================
-- 2. INSERT NEW SERVICES
-- ==========================================
INSERT INTO services (id, name, description, price, currency, billing_cycle, is_active, created_at, updated_at) VALUES 
('d0e65c01-7052-4752-a5e2-000000000001', 'Prime Video', 'OTT Video-on-Demand (VoD) Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000002', 'Netflix', 'OTT Video-on-Demand (VoD) Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000003', 'Disney+', 'OTT Video-on-Demand (VoD) Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000004', 'Showmax', 'OTT Video-on-Demand (VoD) Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000005', 'Crunchyroll', 'OTT Video-on-Demand (VoD) (niche: anime-focused)', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000006', 'Hulu', 'OTT Video-on-Demand (VoD) Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000007', 'HBO Max', 'OTT Video-on-Demand (VoD) Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000008', 'DStv Now', 'OTT Streaming + Live TV (IPTV-style service)', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000009', 'Apple Music', 'Music Streaming Service', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000010', 'Spotify Premium', 'Music Streaming Service (Subscription-based)', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000011', 'iCloud', 'Cloud Storage & Cloud Services Platform', 0, 'ZMW', 'varies', true, NOW(), NOW()),
('d0e65c01-7052-4752-a5e2-000000000012', 'iCloud + Snapchat+', 'Cloud Storage and Social Bundle', 0, 'ZMW', 'varies', true, NOW(), NOW());

-- ==========================================
-- 3. INSERT PLANS
-- ==========================================
-- gen_random_uuid() is used here to auto-generate IDs for the plans
INSERT INTO plans (id, service_id, name, price, currency, is_active, created_at, updated_at) VALUES 
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000001', '1 Month', 65.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000001', '2 Months', 105.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000001', '3 Months', 155.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000002', '1 Month', 100.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000003', '1 Month', 150.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000004', '1 Month', 50.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000005', '1 Month', 45.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000005', '2 Months', 95.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000005', '3 Months', 145.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000006', '1 Month', 150.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000007', '1 Month', 150.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000008', '1 Month', 125.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000008', '2 Months', 185.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000008', '3 Months', 235.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000009', '1 Month', 46.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000009', '2 Months', 95.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000009', '3 Months', 140.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000009', '4 Months', 185.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000009', '5 Months', 230.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000009', '6 Months', 276.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000010', '1 Month', 60.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000010', '2 Months', 100.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000010', '3 Months', 130.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000010', '4 Months', 150.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000010', '5 Months', 180.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000011', '1 Month (50GB)', 70.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000011', '2 Months (200GB)', 200.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000011', '3 Months (1TB)', 350.00, 'ZMW', true, NOW(), NOW()),
(gen_random_uuid(), 'd0e65c01-7052-4752-a5e2-000000000012', '2 Months (50GB)', 115.00, 'ZMW', true, NOW(), NOW());
