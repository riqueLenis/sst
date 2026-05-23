-- Remove dados ficticios antigos das tabelas de negocio.
-- Preserva usuarios reais e apaga apenas logins demo conhecidos.

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `referrals`;
DELETE FROM `absences`;
DELETE FROM `asos`;
DELETE FROM `documents`;
DELETE FROM `transactions`;
DELETE FROM `ppe_deliveries`;
DELETE FROM `ppes`;
DELETE FROM `employees`;
DELETE FROM `roles`;
DELETE FROM `sectors`;
DELETE FROM `companies`;

DELETE FROM `users`
WHERE LOWER(`username`) IN ('admin', 'gestor', 'tecnico');

SET FOREIGN_KEY_CHECKS = 1;