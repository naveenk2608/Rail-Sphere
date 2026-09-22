-- ============================================================
--  Rail-Sphere — sample reference data
-- ============================================================
--  Stations, trains, routes, run days and coaches for the
--  Andhra/Telangana corridors the app already references.
--  Safe to re-run: it clears these five tables first, but
--  leaves users and bookings untouched.
-- ============================================================

USE railsphere_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE coaches;
TRUNCATE TABLE train_routes;
TRUNCATE TABLE train_run_days;
TRUNCATE TABLE trains;
TRUNCATE TABLE stations;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- Stations ----------
INSERT INTO stations (station_id, station_code, station_name) VALUES
  (1,  'SC',   'Secunderabad Junction'),
  (2,  'KMC',  'Khammam'),
  (3,  'BZA',  'Vijayawada Junction'),
  (4,  'TEL',  'Tenali Junction'),
  (5,  'OGL',  'Ongole'),
  (6,  'NLR',  'Nellore'),
  (7,  'GDR',  'Gudur Junction'),
  (8,  'MAS',  'MGR Chennai Central'),
  (9,  'EE',   'Eluru'),
  (10, 'RJY',  'Rajahmundry'),
  (11, 'SLO',  'Samalkot Junction'),
  (12, 'ANV',  'Anakapalle'),
  (13, 'VSKP', 'Visakhapatnam'),
  (14, 'VZM',  'Vizianagaram Junction'),
  (15, 'BAM',  'Brahmapur'),
  (16, 'KUR',  'Khurda Road Junction'),
  (17, 'BBS',  'Bhubaneswar'),
  (18, 'HWH',  'Howrah Junction');

-- ---------- Trains ----------
INSERT INTO trains (train_id, train_number, train_name) VALUES
  (1, '12711', 'Pinakini Express'),
  (2, '12806', 'Janmabhoomi Express'),
  (3, '12805', 'Janmabhoomi Express (Return)'),
  (4, '12863', 'Howrah Express'),
  (5, '17201', 'Golconda Express');

-- ---------- Running days ----------
INSERT INTO train_run_days (train_id, day_of_week) VALUES
  (1,'MON'),(1,'TUE'),(1,'WED'),(1,'THU'),(1,'FRI'),(1,'SAT'),(1,'SUN'),
  (2,'MON'),(2,'TUE'),(2,'WED'),(2,'THU'),(2,'FRI'),(2,'SAT'),(2,'SUN'),
  (3,'MON'),(3,'TUE'),(3,'WED'),(3,'THU'),(3,'FRI'),(3,'SAT'),(3,'SUN'),
  (4,'MON'),(4,'WED'),(4,'FRI'),(4,'SUN'),
  (5,'MON'),(5,'TUE'),(5,'WED'),(5,'THU'),(5,'FRI'),(5,'SAT'),(5,'SUN');

-- ---------- Routes ----------
-- 12711 Pinakini Express: BZA -> MAS
INSERT INTO train_routes
  (train_id, station_id, seq, arrival_time, departure_time,
   arrival_day_offset, departure_day_offset, distance_from_origin) VALUES
  (1, 3, 1, NULL,       '06:00:00', 0, 0,   0),
  (1, 4, 2, '06:28:00', '06:30:00', 0, 0,  32),
  (1, 5, 3, '08:05:00', '08:07:00', 0, 0, 137),
  (1, 6, 4, '09:50:00', '09:52:00', 0, 0, 250),
  (1, 7, 5, '10:25:00', '10:27:00', 0, 0, 289),
  (1, 8, 6, '12:45:00', NULL,       0, 0, 431);

-- 12806 Janmabhoomi Express: SC -> VSKP  (serves BZA -> VSKP)
INSERT INTO train_routes
  (train_id, station_id, seq, arrival_time, departure_time,
   arrival_day_offset, departure_day_offset, distance_from_origin) VALUES
  (2,  1, 1, NULL,       '06:20:00', 0, 0,   0),
  (2,  2, 2, '08:55:00', '08:57:00', 0, 0, 170),
  (2,  3, 3, '10:40:00', '10:50:00', 0, 0, 270),
  (2,  9, 4, '11:45:00', '11:47:00', 0, 0, 330),
  (2, 10, 5, '12:50:00', '12:55:00', 0, 0, 420),
  (2, 11, 6, '13:40:00', '13:42:00', 0, 0, 470),
  (2, 12, 7, '15:00:00', '15:01:00', 0, 0, 590),
  (2, 13, 8, '15:45:00', NULL,       0, 0, 620);

-- 12805 Janmabhoomi Express (Return): VSKP -> SC
INSERT INTO train_routes
  (train_id, station_id, seq, arrival_time, departure_time,
   arrival_day_offset, departure_day_offset, distance_from_origin) VALUES
  (3, 13, 1, NULL,       '06:05:00', 0, 0,   0),
  (3, 12, 2, '06:35:00', '06:36:00', 0, 0,  30),
  (3, 11, 3, '07:50:00', '07:52:00', 0, 0, 150),
  (3, 10, 4, '08:45:00', '08:50:00', 0, 0, 200),
  (3,  9, 5, '09:55:00', '09:57:00', 0, 0, 249),
  (3,  3, 6, '11:10:00', '11:20:00', 0, 0, 350),
  (3,  2, 7, '12:45:00', '12:47:00', 0, 0, 450),
  (3,  1, 8, '15:20:00', NULL,       0, 0, 620);

-- 12863 Howrah Express: VSKP -> HWH, arrives the next calendar day.
-- Exercises the day_offset columns.
INSERT INTO train_routes
  (train_id, station_id, seq, arrival_time, departure_time,
   arrival_day_offset, departure_day_offset, distance_from_origin) VALUES
  (4, 13, 1, NULL,       '20:30:00', 0, 0,   0),
  (4, 14, 2, '21:20:00', '21:22:00', 0, 0,  61),
  (4, 15, 3, '23:55:00', '23:57:00', 0, 0, 280),
  (4, 16, 4, '02:40:00', '02:45:00', 1, 1, 440),
  (4, 17, 5, '03:15:00', '03:20:00', 1, 1, 460),
  (4, 18, 6, '09:50:00', NULL,       1, 1, 880);

-- 17201 Golconda Express: SC -> BZA
INSERT INTO train_routes
  (train_id, station_id, seq, arrival_time, departure_time,
   arrival_day_offset, departure_day_offset, distance_from_origin) VALUES
  (5, 1, 1, NULL,       '06:15:00', 0, 0,   0),
  (5, 2, 2, '09:05:00', '09:07:00', 0, 0, 190),
  (5, 3, 3, '11:30:00', NULL,       0, 0, 270);

-- ---------- Coaches ----------
-- Seven per train: 3 sleeper, 2 third AC, 1 second AC, 1 first AC.
INSERT INTO coaches (train_id, coach_number, coach_type, total_seats)
SELECT t.train_id, c.coach_number, c.coach_type, c.total_seats
FROM trains t
CROSS JOIN (
  SELECT 'S1' AS coach_number, 'SL' AS coach_type, 72 AS total_seats
  UNION ALL SELECT 'S2', 'SL', 72
  UNION ALL SELECT 'S3', 'SL', 72
  UNION ALL SELECT 'B1', '3A', 64
  UNION ALL SELECT 'B2', '3A', 64
  UNION ALL SELECT 'A1', '2A', 46
  UNION ALL SELECT 'H1', '1A', 24
) c;

-- ---------- Verify ----------
SELECT 'stations'       AS table_name, COUNT(*) AS rows_inserted FROM stations
UNION ALL SELECT 'trains',         COUNT(*) FROM trains
UNION ALL SELECT 'train_run_days', COUNT(*) FROM train_run_days
UNION ALL SELECT 'train_routes',   COUNT(*) FROM train_routes
UNION ALL SELECT 'coaches',        COUNT(*) FROM coaches;
