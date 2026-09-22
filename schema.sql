-- ============================================================
--  Rail-Sphere — Database Schema
-- ============================================================
--  8 tables. Route-segment seat allocation: a seat booked A->C
--  is still sellable for D->F on the same journey date.
--
--  Coach class reference data (fare rate per km, display label, seat
--  layout) is NOT stored here. It lives in backend/config/coach-classes.json,
--  loaded once at server start and served to the frontend, so it has one
--  home with git history rather than four hardcoded copies.
-- ============================================================

--  WARNING: this script DROPS AND RECREATES all Rail-Sphere tables.
--  Every booking and user account in the target database is destroyed.
--  It only touches the tables listed below, not the rest of the database.

CREATE DATABASE IF NOT EXISTS railsphere_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE railsphere_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS passenger_seat_map;   -- removed in this revision
DROP TABLE IF EXISTS booking_passengers;   -- removed in this revision
DROP TABLE IF EXISTS saved_passengers;     -- removed in this revision
DROP TABLE IF EXISTS seat_bookings;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS train_routes;
DROP TABLE IF EXISTS train_run_days;
DROP TABLE IF EXISTS trains;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users
CREATE TABLE users (
    user_id       BIGINT       PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Stations
CREATE TABLE stations (
    station_id   BIGINT       PRIMARY KEY AUTO_INCREMENT,
    station_code VARCHAR(10)  NOT NULL UNIQUE,
    station_name VARCHAR(100) NOT NULL,
    KEY idx_station_name (station_name)
) ENGINE=InnoDB;

-- 3. Trains
CREATE TABLE trains (
    train_id     BIGINT       PRIMARY KEY AUTO_INCREMENT,
    train_number VARCHAR(20)  NOT NULL UNIQUE,
    train_name   VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 4. Train Running Days
--    (train_id, day_of_week) is the natural key; no surrogate needed.
CREATE TABLE train_run_days (
    train_id    BIGINT NOT NULL,
    day_of_week ENUM('MON','TUE','WED','THU','FRI','SAT','SUN') NOT NULL,
    PRIMARY KEY (train_id, day_of_week),
    FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Train Routes
--    day_offset lets a journey span midnight / multiple days:
--    0 = same day as bookings.journey_date, 1 = next day, etc.
CREATE TABLE train_routes (
    route_id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    train_id             BIGINT NOT NULL,
    station_id           BIGINT NOT NULL,
    seq                  INT    NOT NULL,
    arrival_time         TIME   NULL,
    departure_time       TIME   NULL,
    arrival_day_offset   INT    NOT NULL DEFAULT 0,
    departure_day_offset INT    NOT NULL DEFAULT 0,
    distance_from_origin INT    NOT NULL,
    FOREIGN KEY (train_id)   REFERENCES trains(train_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    UNIQUE KEY uq_train_seq     (train_id, seq),
    UNIQUE KEY uq_train_station (train_id, station_id),
    KEY idx_station_lookup (station_id, train_id),
    CONSTRAINT chk_route_seq      CHECK (seq > 0),
    CONSTRAINT chk_route_distance CHECK (distance_from_origin >= 0)
) ENGINE=InnoDB;

-- 6. Coaches
--    total_seats is per-coach, not per-type: real SL coaches ship in both
--    72 and 80 berth layouts, and 1A varies by cabin configuration.
CREATE TABLE coaches (
    coach_id     BIGINT      PRIMARY KEY AUTO_INCREMENT,
    train_id     BIGINT      NOT NULL,
    coach_number VARCHAR(20) NOT NULL,
    coach_type   ENUM('SL','3A','2A','1A') NOT NULL,
    total_seats  INT         NOT NULL,
    FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE,
    UNIQUE KEY uq_train_coach (train_id, coach_number),
    KEY idx_train_type (train_id, coach_type),
    CONSTRAINT chk_coach_seats CHECK (total_seats > 0)
) ENGINE=InnoDB;

-- 7. Bookings
CREATE TABLE bookings (
    booking_id             BIGINT        PRIMARY KEY AUTO_INCREMENT,
    user_id                BIGINT        NOT NULL,
    train_id               BIGINT        NOT NULL,
    journey_date           DATE          NOT NULL,
    source_station_id      BIGINT        NOT NULL,
    destination_station_id BIGINT        NOT NULL,
    coach_type             ENUM('SL','3A','2A','1A') NOT NULL,
    total_amount           DECIMAL(10,2) NOT NULL,
    booking_status         ENUM('CONFIRMED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    pnr                    CHAR(12)      NOT NULL UNIQUE,
    created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at           TIMESTAMP     NULL,
    FOREIGN KEY (user_id)                REFERENCES users(user_id),
    FOREIGN KEY (train_id)               REFERENCES trains(train_id),
    FOREIGN KEY (source_station_id)      REFERENCES stations(station_id),
    FOREIGN KEY (destination_station_id) REFERENCES stations(station_id),
    KEY idx_user_journey (user_id, journey_date),
    CONSTRAINT chk_booking_stations CHECK (source_station_id <> destination_station_id),
    CONSTRAINT chk_booking_amount   CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- 8. Seat Bookings
--    One row = one passenger, in one seat, for one route segment.
--    Absorbs the old `booking_passengers` and `passenger_seat_map` tables:
--    the relationship was strictly 1:1, so the junction table was pure
--    overhead and its cartesian join was producing wrong passenger counts.
--
--    journey_date and status are denormalized copies of bookings.journey_date
--    and bookings.booking_status. This is DELIBERATE: both are columns in
--    idx_availability below, and joining to `bookings` on the availability
--    hot path would cost more than the duplication. They must always be
--    written inside the same transaction as their source columns.
CREATE TABLE seat_bookings (
    seat_booking_id BIGINT       PRIMARY KEY AUTO_INCREMENT,
    booking_id      BIGINT       NOT NULL,
    coach_id        BIGINT       NOT NULL,
    seat_no         INT          NOT NULL,
    from_seq        INT          NOT NULL,
    to_seq          INT          NOT NULL,
    journey_date    DATE         NOT NULL,
    status          ENUM('CONFIRMED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    passenger_name  VARCHAR(100) NOT NULL,
    age             INT          NOT NULL,
    gender          ENUM('M','F','OTHER') NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id)   REFERENCES coaches(coach_id),
    KEY idx_availability (coach_id, journey_date, status, from_seq, to_seq),
    KEY idx_booking (booking_id),
    CONSTRAINT chk_seat_segment CHECK (from_seq < to_seq),
    CONSTRAINT chk_seat_no      CHECK (seat_no > 0),
    CONSTRAINT chk_seat_age     CHECK (age > 0 AND age < 150)
) ENGINE=InnoDB;

-- ============================================================
--  Removed in this revision
-- ============================================================
--  passenger_seat_map  — junction table for a strictly 1:1 relationship.
--                        Folded into seat_bookings.
--  booking_passengers  — folded into seat_bookings. Having passengers and
--                        seats in separate tables, both joined on booking_id,
--                        was producing an N x N cartesian product and
--                        reporting passenger_count as N^2.
--  saved_passengers    — every column was a copy of data already in booking
--                        history, and its add/delete endpoints were never
--                        called by the frontend. The quick-fill list is now
--                        derived:
--
--      SELECT sb.passenger_name, sb.age, sb.gender, MAX(b.created_at) AS last_used
--      FROM seat_bookings sb
--      JOIN bookings b ON b.booking_id = sb.booking_id
--      WHERE b.user_id = ?
--      GROUP BY sb.passenger_name, sb.age, sb.gender
--      ORDER BY last_used DESC
--      LIMIT 10;
-- ============================================================
