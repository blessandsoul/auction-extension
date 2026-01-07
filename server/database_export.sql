-- ============================================
-- MySQL Database Export for Coolify Import
-- Database: auction_auth_service (or 'default' in Coolify)
-- Generated: 2026-01-06
-- ============================================

-- Note: Since your Coolify database is named 'default', 
-- you should import this directly into that database.
-- Remove the CREATE DATABASE and USE statements if importing via phpMyAdmin
-- (phpMyAdmin will use the selected database automatically)

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ============================================
-- Table structure for table `users`
-- ============================================

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `role` varchar(20) DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table structure for table `credentials`
-- ============================================

DROP TABLE IF EXISTS `credentials`;
CREATE TABLE `credentials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `site` varchar(50) NOT NULL,
  `account_name` varchar(50) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table structure for table `ui_restrictions`
-- ============================================

DROP TABLE IF EXISTS `ui_restrictions`;
CREATE TABLE `ui_restrictions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `selector` text NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Dumping data for table `credentials`
-- ============================================

INSERT INTO `credentials` (`id`, `site`, `account_name`, `username`, `password`, `updated_at`) VALUES
(1, 'copart', 'copart1', '470928', 'replace2112!', CURRENT_TIMESTAMP),
(2, 'copart', 'copart2', '269708', 'bidnodari123', CURRENT_TIMESTAMP),
(3, 'iaai', 'iaai', 'nodargogorishvili@gmail.com', 'vanius2525@', CURRENT_TIMESTAMP);

-- ============================================
-- Dumping data for table `users` (Optional)
-- Uncomment the line below if you want to add a default user
-- ============================================

-- INSERT INTO `users` (`id`, `username`, `role`, `created_at`) VALUES
-- (1, 'usalogistics', 'logistics', CURRENT_TIMESTAMP);

-- ============================================
-- Finalize
-- ============================================

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
