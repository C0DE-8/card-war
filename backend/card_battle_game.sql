-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 14, 2026 at 07:16 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `card_battle_game`
--

-- --------------------------------------------------------

--
-- Table structure for table `battle_matches`
--

CREATE TABLE `battle_matches` (
  `id` int(11) NOT NULL,
  `player_one_id` int(11) NOT NULL,
  `player_two_id` int(11) NOT NULL,
  `player_one_deck_id` int(11) NOT NULL,
  `player_two_deck_id` int(11) NOT NULL,
  `status` enum('waiting','in_progress','finished','cancelled') NOT NULL DEFAULT 'waiting',
  `winner_player_id` int(11) DEFAULT NULL,
  `player_one_round_wins` int(11) NOT NULL DEFAULT 0,
  `player_two_round_wins` int(11) NOT NULL DEFAULT 0,
  `current_round_number` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `battle_match_card_decay`
--

CREATE TABLE `battle_match_card_decay` (
  `id` int(11) NOT NULL,
  `match_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `card_id` int(11) NOT NULL,
  `stat_type` enum('power','magic','skill') NOT NULL,
  `win_count` int(11) NOT NULL DEFAULT 0,
  `total_decay` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `battle_rounds`
--

CREATE TABLE `battle_rounds` (
  `id` int(11) NOT NULL,
  `match_id` int(11) NOT NULL,
  `round_number` int(11) NOT NULL,
  `status` enum('power','magic','skill','finished') NOT NULL DEFAULT 'power',
  `power_winner_player_id` int(11) DEFAULT NULL,
  `magic_winner_player_id` int(11) DEFAULT NULL,
  `skill_winner_player_id` int(11) DEFAULT NULL,
  `round_winner_player_id` int(11) DEFAULT NULL,
  `finished_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `battle_round_moves`
--

CREATE TABLE `battle_round_moves` (
  `id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `stat_type` enum('power','magic','skill') NOT NULL,
  `card_id` int(11) NOT NULL,
  `base_value` int(11) NOT NULL,
  `cost_value` int(11) NOT NULL DEFAULT 1,
  `advantage_boost` int(11) NOT NULL DEFAULT 0,
  `final_value` int(11) NOT NULL,
  `is_winner` tinyint(1) NOT NULL DEFAULT 0,
  `did_decay_apply` tinyint(1) NOT NULL DEFAULT 0,
  `submission_order` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cards`
--

CREATE TABLE `cards` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL,
  `element_type` varchar(30) DEFAULT NULL,
  `power` int(11) DEFAULT 0,
  `magic` int(11) DEFAULT 0,
  `skill` int(11) DEFAULT 0,
  `cost` int(11) NOT NULL DEFAULT 1,
  `effect` varchar(50) DEFAULT NULL,
  `value` int(11) DEFAULT 0,
  `rarity_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_starter_card` tinyint(1) NOT NULL DEFAULT 0,
  `starter_weight` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image_path` varchar(255) DEFAULT NULL,
  `image_filename` varchar(255) DEFAULT NULL,
  `image_mime_type` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cards`
--

INSERT INTO `cards` (`id`, `name`, `type`, `element_type`, `power`, `magic`, `skill`, `cost`, `effect`, `value`, `rarity_id`, `description`, `is_active`, `is_starter_card`, `starter_weight`, `created_at`, `updated_at`, `image_path`, `image_filename`, `image_mime_type`) VALUES
(1, 'Aqua Knight', 'character', 'water', 82, 76, 70, 3, NULL, 0, 1, 'Balanced water fighter.', 1, 1, 10, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(2, 'Flame Burst', 'character', 'fire', 88, 69, 65, 4, NULL, 0, 1, 'Aggressive fire striker.', 1, 1, 10, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(3, 'Stone Guard', 'character', 'rock', 80, 50, 72, 3, NULL, 0, 1, 'Stable rock defender.', 1, 1, 10, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(4, 'Wind Fang', 'character', 'wind', 68, 74, 87, 2, NULL, 0, 1, 'Fast wind skill card.', 1, 1, 10, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(5, 'Shadow Veil', 'character', 'shadow', 73, 86, 78, 4, NULL, 0, 2, 'Shadow pressure specialist.', 1, 1, 7, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(6, 'Light Bringer', 'character', 'light', 75, 84, 76, 4, NULL, 0, 2, 'Light-based balanced rare.', 1, 1, 7, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(7, 'Thunder Horn', 'character', 'lightning', 79, 71, 85, 3, NULL, 0, 2, 'Sharp lightning striker.', 1, 1, 7, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(8, 'Nature Bloom', 'character', 'nature', 70, 83, 68, 2, NULL, 0, 1, 'Nature magic support card.', 1, 1, 10, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(9, 'Frost Pulse', 'character', 'ice', 74, 88, 63, 3, NULL, 0, 2, 'Cold magic burst card.', 1, 1, 7, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL),
(10, 'Iron Claw', 'character', 'metal', 86, 55, 77, 4, NULL, 0, 1, 'Heavy metal bruiser.', 1, 1, 10, '2026-04-13 14:04:56', '2026-04-13 14:04:56', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `card_element_advantages`
--

CREATE TABLE `card_element_advantages` (
  `id` int(11) NOT NULL,
  `attacker_element` varchar(30) NOT NULL,
  `defender_element` varchar(30) NOT NULL,
  `boost_value` int(11) NOT NULL DEFAULT 20,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `card_element_advantages`
--

INSERT INTO `card_element_advantages` (`id`, `attacker_element`, `defender_element`, `boost_value`, `created_at`) VALUES
(1, 'water', 'fire', 20, '2026-04-13 14:04:41'),
(2, 'fire', 'nature', 20, '2026-04-13 14:04:41'),
(3, 'nature', 'water', 20, '2026-04-13 14:04:41'),
(4, 'rock', 'lightning', 20, '2026-04-13 14:04:41'),
(5, 'lightning', 'water', 20, '2026-04-13 14:04:41'),
(6, 'wind', 'rock', 20, '2026-04-13 14:04:41'),
(7, 'shadow', 'light', 20, '2026-04-13 14:04:41'),
(8, 'light', 'shadow', 20, '2026-04-13 14:04:41'),
(9, 'ice', 'wind', 20, '2026-04-13 14:04:41'),
(10, 'metal', 'rock', 20, '2026-04-13 14:04:41');

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `level` int(11) NOT NULL DEFAULT 1,
  `exp` int(11) NOT NULL DEFAULT 0,
  `rp` int(11) NOT NULL DEFAULT 50,
  `coins` int(11) NOT NULL DEFAULT 1000,
  `gems` int(11) NOT NULL DEFAULT 20,
  `wins` int(11) NOT NULL DEFAULT 0,
  `losses` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_admin` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`id`, `username`, `email`, `password`, `level`, `exp`, `rp`, `coins`, `gems`, `wins`, `losses`, `created_at`, `updated_at`, `is_admin`) VALUES
(1, 'light', '8amlight@gmail.com', '$2b$10$7fRTgyHF7ckGAhAxT.ZxVO/L/Mmo0J0DbDi30SJkXXa3f842VDqjS', 1, 0, 50, 1000, 20, 0, 0, '2026-04-13 02:43:15', '2026-04-13 03:58:21', 1),
(2, 'habibi', 'habibi@gmail.com', '$2b$10$t/n3TL1PuFDVWuarVvOhxepDvGICaRAfqw7Yqe8eGaNEPD.xjXEzi', 1, 0, 50, 1000, 20, 0, 0, '2026-04-13 14:50:27', '2026-04-13 14:50:27', 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_cards`
--

CREATE TABLE `player_cards` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `card_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `acquired_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_cards`
--

INSERT INTO `player_cards` (`id`, `player_id`, `card_id`, `quantity`, `acquired_at`) VALUES
(1, 2, 9, 1, '2026-04-13 14:50:27'),
(2, 2, 5, 1, '2026-04-13 14:50:27'),
(3, 2, 2, 1, '2026-04-13 14:50:27'),
(4, 2, 1, 1, '2026-04-13 14:50:27'),
(5, 2, 3, 1, '2026-04-13 14:50:27'),
(6, 2, 4, 1, '2026-04-13 14:50:27'),
(7, 2, 7, 1, '2026-04-13 14:50:28'),
(8, 2, 8, 1, '2026-04-13 14:50:28'),
(9, 2, 10, 1, '2026-04-13 14:50:28'),
(10, 2, 6, 1, '2026-04-13 14:50:28');

-- --------------------------------------------------------

--
-- Table structure for table `player_decks`
--

CREATE TABLE `player_decks` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_decks`
--

INSERT INTO `player_decks` (`id`, `player_id`, `name`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 2, 'Starter Deck', 1, '2026-04-13 14:50:27', '2026-04-13 14:50:27');

-- --------------------------------------------------------

--
-- Table structure for table `player_deck_cards`
--

CREATE TABLE `player_deck_cards` (
  `id` int(11) NOT NULL,
  `deck_id` int(11) NOT NULL,
  `card_id` int(11) NOT NULL,
  `slot_number` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `player_deck_cards`
--

INSERT INTO `player_deck_cards` (`id`, `deck_id`, `card_id`, `slot_number`, `created_at`) VALUES
(1, 1, 9, 1, '2026-04-13 14:50:27'),
(2, 1, 5, 2, '2026-04-13 14:50:27'),
(3, 1, 2, 3, '2026-04-13 14:50:27'),
(4, 1, 1, 4, '2026-04-13 14:50:27'),
(5, 1, 3, 5, '2026-04-13 14:50:27'),
(6, 1, 4, 6, '2026-04-13 14:50:28'),
(7, 1, 7, 7, '2026-04-13 14:50:28'),
(8, 1, 8, 8, '2026-04-13 14:50:28'),
(9, 1, 10, 9, '2026-04-13 14:50:28'),
(10, 1, 6, 10, '2026-04-13 14:50:28');

-- --------------------------------------------------------

--
-- Table structure for table `rarities`
--

CREATE TABLE `rarities` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `drop_rate` decimal(5,4) DEFAULT 0.0000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rarities`
--

INSERT INTO `rarities` (`id`, `name`, `color`, `drop_rate`, `created_at`) VALUES
(1, 'common', '#9e9e9e', 0.6000, '2026-04-13 02:58:01'),
(2, 'rare', '#2196f3', 0.2500, '2026-04-13 02:58:01'),
(3, 'epic', '#9c27b0', 0.1000, '2026-04-13 02:58:01'),
(4, 'legendary', '#ff9800', 0.0500, '2026-04-13 02:58:01');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `battle_matches`
--
ALTER TABLE `battle_matches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_battle_matches_p1` (`player_one_id`),
  ADD KEY `idx_battle_matches_p2` (`player_two_id`),
  ADD KEY `idx_battle_matches_status` (`status`),
  ADD KEY `fk_battle_matches_winner` (`winner_player_id`);

--
-- Indexes for table `battle_match_card_decay`
--
ALTER TABLE `battle_match_card_decay`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_match_player_card_stat` (`match_id`,`player_id`,`card_id`,`stat_type`),
  ADD KEY `fk_battle_match_card_decay_player` (`player_id`),
  ADD KEY `fk_battle_match_card_decay_card` (`card_id`);

--
-- Indexes for table `battle_rounds`
--
ALTER TABLE `battle_rounds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_match_round` (`match_id`,`round_number`),
  ADD KEY `fk_battle_rounds_power_winner` (`power_winner_player_id`),
  ADD KEY `fk_battle_rounds_magic_winner` (`magic_winner_player_id`),
  ADD KEY `fk_battle_rounds_skill_winner` (`skill_winner_player_id`),
  ADD KEY `fk_battle_rounds_round_winner` (`round_winner_player_id`);

--
-- Indexes for table `battle_round_moves`
--
ALTER TABLE `battle_round_moves`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_round_player_stat` (`round_id`,`player_id`,`stat_type`),
  ADD KEY `fk_battle_round_moves_player` (`player_id`),
  ADD KEY `fk_battle_round_moves_card` (`card_id`);

--
-- Indexes for table `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cards_type` (`type`),
  ADD KEY `idx_cards_rarity_id` (`rarity_id`),
  ADD KEY `idx_cards_is_active` (`is_active`);

--
-- Indexes for table `card_element_advantages`
--
ALTER TABLE `card_element_advantages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_element_matchup` (`attacker_element`,`defender_element`);

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `player_cards`
--
ALTER TABLE `player_cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_player_card` (`player_id`,`card_id`),
  ADD KEY `idx_player_cards_player_id` (`player_id`),
  ADD KEY `idx_player_cards_card_id` (`card_id`);

--
-- Indexes for table `player_decks`
--
ALTER TABLE `player_decks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_player_decks_player_id` (`player_id`);

--
-- Indexes for table `player_deck_cards`
--
ALTER TABLE `player_deck_cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_deck_slot` (`deck_id`,`slot_number`),
  ADD UNIQUE KEY `uniq_deck_card` (`deck_id`,`card_id`),
  ADD KEY `idx_player_deck_cards_card_id` (`card_id`);

--
-- Indexes for table `rarities`
--
ALTER TABLE `rarities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `battle_matches`
--
ALTER TABLE `battle_matches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `battle_match_card_decay`
--
ALTER TABLE `battle_match_card_decay`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `battle_rounds`
--
ALTER TABLE `battle_rounds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `battle_round_moves`
--
ALTER TABLE `battle_round_moves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cards`
--
ALTER TABLE `cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `card_element_advantages`
--
ALTER TABLE `card_element_advantages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `player_cards`
--
ALTER TABLE `player_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `player_decks`
--
ALTER TABLE `player_decks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `player_deck_cards`
--
ALTER TABLE `player_deck_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `rarities`
--
ALTER TABLE `rarities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `battle_matches`
--
ALTER TABLE `battle_matches`
  ADD CONSTRAINT `fk_battle_matches_p1` FOREIGN KEY (`player_one_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_matches_p2` FOREIGN KEY (`player_two_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_matches_winner` FOREIGN KEY (`winner_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `battle_match_card_decay`
--
ALTER TABLE `battle_match_card_decay`
  ADD CONSTRAINT `fk_battle_match_card_decay_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_match_card_decay_match` FOREIGN KEY (`match_id`) REFERENCES `battle_matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_match_card_decay_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `battle_rounds`
--
ALTER TABLE `battle_rounds`
  ADD CONSTRAINT `fk_battle_rounds_magic_winner` FOREIGN KEY (`magic_winner_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_rounds_match` FOREIGN KEY (`match_id`) REFERENCES `battle_matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_rounds_power_winner` FOREIGN KEY (`power_winner_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_rounds_round_winner` FOREIGN KEY (`round_winner_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_rounds_skill_winner` FOREIGN KEY (`skill_winner_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `battle_round_moves`
--
ALTER TABLE `battle_round_moves`
  ADD CONSTRAINT `fk_battle_round_moves_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_round_moves_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_battle_round_moves_round` FOREIGN KEY (`round_id`) REFERENCES `battle_rounds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `cards`
--
ALTER TABLE `cards`
  ADD CONSTRAINT `fk_cards_rarity` FOREIGN KEY (`rarity_id`) REFERENCES `rarities` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `player_cards`
--
ALTER TABLE `player_cards`
  ADD CONSTRAINT `fk_player_cards_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_player_cards_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `player_decks`
--
ALTER TABLE `player_decks`
  ADD CONSTRAINT `fk_player_decks_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `player_deck_cards`
--
ALTER TABLE `player_deck_cards`
  ADD CONSTRAINT `fk_player_deck_cards_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_player_deck_cards_deck` FOREIGN KEY (`deck_id`) REFERENCES `player_decks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
