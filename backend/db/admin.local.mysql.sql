USE `sst`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `role` VARCHAR(40) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (
  `id`,
  `username`,
  `name`,
  `role`,
  `password_hash`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'admin-local',
  'admin',
  'Administrador SST',
  'admin',
  '$2b$10$mfAXMNGI8d7KpuiIPX4jsuvitIjzUu65MBTzRz/3Crn7KOEw0ecmC',
  1,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `role` = VALUES(`role`),
  `password_hash` = VALUES(`password_hash`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW(3);