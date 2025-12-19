USE auction_auth_service;

-- Clear existing credentials to avoid duplicates/confusion
TRUNCATE TABLE credentials;

-- Insert Real Credentials
INSERT INTO credentials (site, account_name, username, password) VALUES 
-- Copart Account 1 (Mapped to "Open Copart I" button)
('copart', 'copart1', '470928', 'replace2112!'),

-- Copart Account 2 (Mapped to "Open Copart II" button)
('copart', 'copart2', '269708', 'bidnodari123'),

-- IAAI Account (Mapped to "Open IAAI" button)
('iaai', 'iaai', 'nodargogorishvili@gmail.com', 'vanius2525@');

-- Sample User (Your auth username)
-- INSERT IGNORE INTO users (username, role) VALUES ('usalogistics', 'logistics');
