-- Dump SQL gerado automaticamente a partir do banco local
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE DATABASE IF NOT EXISTS `sst` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sst`;

DROP TABLE IF EXISTS `absences`;
CREATE TABLE `absences` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_absences_created_at` (`created_at`),
  KEY `idx_absences_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `asos`;
CREATE TABLE `asos` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asos_created_at` (`created_at`),
  KEY `idx_asos_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `companies`;
CREATE TABLE `companies` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_companies_created_at` (`created_at`),
  KEY `idx_companies_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_documents_created_at` (`created_at`),
  KEY `idx_documents_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employees_created_at` (`created_at`),
  KEY `idx_employees_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ppe_deliveries`;
CREATE TABLE `ppe_deliveries` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ppe_deliveries_created_at` (`created_at`),
  KEY `idx_ppe_deliveries_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ppes`;
CREATE TABLE `ppes` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ppes_created_at` (`created_at`),
  KEY `idx_ppes_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `referrals`;
CREATE TABLE `referrals` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_referrals_created_at` (`created_at`),
  KEY `idx_referrals_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_roles_created_at` (`created_at`),
  KEY `idx_roles_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sectors`;
CREATE TABLE `sectors` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sectors_created_at` (`created_at`),
  KEY `idx_sectors_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_created_at` (`created_at`),
  KEY `idx_transactions_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `absences` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"employeeId\":\"1\",\"startDate\":\"2023-08-01\",\"endDate\":\"2023-08-15\",\"reason\":\"doenca\",\"cid\":\"J01.9\",\"doctor\":\"Dr. Mendes\",\"status\":\"finished\"}', '2026-05-10 04:25:33.124', '2026-05-10 04:25:33.124');

INSERT INTO `asos` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"employeeId\":\"1\",\"type\":\"admissional\",\"date\":\"2020-01-10\",\"validUntil\":\"2021-01-10\",\"result\":\"apto\",\"doctor\":\"Dr. Silva\",\"crm\":\"12345-SP\",\"notes\":\"\"}', '2026-05-10 04:25:33.112', '2026-05-10 04:25:33.112'),
  ('2', '{\"id\":\"2\",\"employeeId\":\"2\",\"type\":\"periodico\",\"date\":\"2023-05-20\",\"validUntil\":\"2024-05-20\",\"result\":\"apto\",\"doctor\":\"Dra. Costa\",\"crm\":\"54321-MG\",\"notes\":\"Apto com restrição para altura\"}', '2026-05-10 04:25:33.112', '2026-05-10 04:25:33.112');

INSERT INTO `companies` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"name\":\"Empresa Alpha Ltda\",\"cnpj\":\"12.345.678/0001-90\",\"address\":\"Rua A, 123\",\"contact\":\"contato@alpha.com\"}', '2026-05-10 04:25:32.993', '2026-05-10 04:25:32.993'),
  ('2', '{\"id\":\"2\",\"name\":\"Indústria Beta S.A.\",\"cnpj\":\"98.765.432/0001-10\",\"address\":\"Av B, 456\",\"contact\":\"rh@beta.com\"}', '2026-05-10 04:25:32.993', '2026-05-10 04:25:32.993');

INSERT INTO `documents` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"companyId\":\"1\",\"type\":\"PGR\",\"title\":\"PGR 2023/2024\",\"issueDate\":\"2023-01-15\",\"validUntil\":\"2024-01-15\",\"status\":\"active\",\"hasInsalubrity\":false,\"hasPericulosity\":true,\"notes\":\"Renovação anual\"}', '2026-05-10 04:25:33.099', '2026-05-10 04:25:33.099'),
  ('2', '{\"id\":\"2\",\"companyId\":\"2\",\"type\":\"LTCAT\",\"title\":\"LTCAT - Indústria Beta\",\"issueDate\":\"2022-06-10\",\"validUntil\":\"2023-06-10\",\"status\":\"expired\",\"hasInsalubrity\":true,\"hasPericulosity\":false,\"notes\":\"Necessita revisão\"}', '2026-05-10 04:25:33.099', '2026-05-10 04:25:33.099');

INSERT INTO `employees` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"name\":\"João Silva\",\"cpf\":\"111.222.333-44\",\"rg\":\"MG-12.345.678\",\"birthDate\":\"1990-05-15\",\"admissionDate\":\"2020-01-10\",\"companyId\":\"1\",\"roleId\":\"1\",\"status\":\"active\"}', '2026-05-10 04:25:33.039', '2026-05-10 04:25:33.039'),
  ('2', '{\"id\":\"2\",\"name\":\"Maria Souza\",\"cpf\":\"555.666.777-88\",\"rg\":\"SP-98.765.432\",\"birthDate\":\"1985-11-20\",\"admissionDate\":\"2019-03-01\",\"companyId\":\"2\",\"roleId\":\"2\",\"status\":\"active\"}', '2026-05-10 04:25:33.039', '2026-05-10 04:25:33.039');

INSERT INTO `ppe_deliveries` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"employeeId\":\"1\",\"ppeId\":\"1\",\"quantity\":1,\"deliveryDate\":\"2023-10-01\",\"reason\":\"Admissão\",\"status\":\"delivered\"}', '2026-05-10 04:25:33.072', '2026-05-10 04:25:33.072');

INSERT INTO `ppes` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"name\":\"Capacete de Segurança\",\"ca\":\"12345\",\"description\":\"Capacete classe B\",\"stockQuantity\":50}', '2026-05-10 04:25:33.053', '2026-05-10 04:25:33.053'),
  ('2', '{\"id\":\"2\",\"name\":\"Luva de Raspa\",\"ca\":\"67890\",\"description\":\"Luva para trabalhos pesados\",\"stockQuantity\":100}', '2026-05-10 04:25:33.053', '2026-05-10 04:25:33.053'),
  ('3', '{\"id\":\"3\",\"name\":\"Protetor Auricular\",\"ca\":\"11223\",\"description\":\"Protetor tipo plug\",\"stockQuantity\":200}', '2026-05-10 04:25:33.053', '2026-05-10 04:25:33.053');

INSERT INTO `referrals` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"employeeId\":\"2\",\"date\":\"2023-10-25\",\"specialty\":\"Oftalmologia\",\"reason\":\"Baixa acuidade visual relatada no periódico\",\"status\":\"pending\"}', '2026-05-10 04:25:33.130', '2026-05-10 04:25:33.130');

INSERT INTO `roles` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"name\":\"Operador de Máquina\",\"sectorId\":\"1\",\"description\":\"Opera máquinas industriais\"}', '2026-05-10 04:25:33.024', '2026-05-10 04:25:33.024'),
  ('2', '{\"id\":\"2\",\"name\":\"Auxiliar Administrativo\",\"sectorId\":\"2\",\"description\":\"Apoio administrativo\"}', '2026-05-10 04:25:33.024', '2026-05-10 04:25:33.024');

INSERT INTO `sectors` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"name\":\"Produção\",\"description\":\"Área de manufatura\"}', '2026-05-10 04:25:33.011', '2026-05-10 04:25:33.011'),
  ('2', '{\"id\":\"2\",\"name\":\"Administrativo\",\"description\":\"Escritório central\"}', '2026-05-10 04:25:33.011', '2026-05-10 04:25:33.011');

INSERT INTO `transactions` (`id`, `data`, `created_at`, `updated_at`) VALUES
  ('1', '{\"id\":\"1\",\"companyId\":\"1\",\"type\":\"income\",\"amount\":5000,\"date\":\"2023-10-05\",\"dueDate\":\"2023-10-10\",\"description\":\"Faturamento Mensal - SST\",\"status\":\"paid\",\"category\":\"Faturamento\"}', '2026-05-10 04:25:33.080', '2026-05-10 04:25:33.080'),
  ('2', '{\"id\":\"2\",\"companyId\":\"2\",\"type\":\"income\",\"amount\":3500,\"date\":\"2023-10-15\",\"dueDate\":\"2023-10-20\",\"description\":\"Treinamento NR-35\",\"status\":\"pending\",\"category\":\"Treinamentos\"}', '2026-05-10 04:25:33.080', '2026-05-10 04:25:33.080'),
  ('3', '{\"id\":\"3\",\"companyId\":\"1\",\"type\":\"expense\",\"amount\":1200,\"date\":\"2023-10-02\",\"dueDate\":\"2023-10-05\",\"description\":\"Compra de EPIs\",\"status\":\"paid\",\"category\":\"Fornecedores\"}', '2026-05-10 04:25:33.080', '2026-05-10 04:25:33.080');

INSERT INTO `users` (`id`, `username`, `name`, `role`, `password_hash`, `is_active`, `created_at`, `updated_at`) VALUES
  ('0f23ad64-f6e0-4ae6-a8dd-a3a8dd81ee69', 'gestor', 'Gestor SST', 'manager', '$2b$10$2zBK0BBbqdKH4ree3p9RYuFOXwBmjrPcR1PScBJG0RSrSwHVr9gdW', 1, '2026-05-10 04:25:33.443', '2026-05-10 04:25:33.443'),
  ('b3650397-ece4-4592-9f29-9d75ff123db9', 'tecnico', 'Tecnico SST', 'technician', '$2b$10$/uVL3x5l7y22MC4tc6h9yOLrw6Mfv4TC7djyKoBlsZ57vI5EdlidG', 1, '2026-05-10 04:25:33.458', '2026-05-10 04:25:33.458'),
  ('e7e003b3-30f2-4334-aa13-ab2c7fbb6223', 'admin', 'Administrador SST', 'admin', '$2b$10$mfAXMNGI8d7KpuiIPX4jsuvitIjzUu65MBTzRz/3Crn7KOEw0ecmC', 1, '2026-05-10 04:25:33.427', '2026-05-10 04:42:12.996');
