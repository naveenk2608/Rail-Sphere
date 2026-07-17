-- ============================================================
--  Rail-Sphere — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS railsphere_db;
USE railsphere_db;

-- 1. Users
CREATE TABLE users (
    user_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(100)  UNIQUE NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- 2. Saved Passengers
CREATE TABLE saved_passengers (
    saved_passenger_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id            BIGINT       NOT NULL,
    passenger_name     VARCHAR(100) NOT NULL,
    age                INT          NOT NULL,
    gender             ENUM('M','F','OTHER'),
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Stations
CREATE TABLE stations (
    station_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    station_code VARCHAR(10)  UNIQUE NOT NULL,
    station_name VARCHAR(100) NOT NULL
);

-- 4. Trains
CREATE TABLE trains (
    train_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    train_number VARCHAR(20)  UNIQUE NOT NULL,
    train_name   VARCHAR(100) NOT NULL
);

-- 5. Train Running Days
CREATE TABLE train_run_days (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    train_id    BIGINT NOT NULL,
    day_of_week ENUM('MON','TUE','WED','THU','FRI','SAT','SUN') NOT NULL,
    FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE
);

-- 6. Train Routes
CREATE TABLE train_routes (
    route_id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    train_id             BIGINT NOT NULL,
    station_id           BIGINT NOT NULL,
    seq                  INT    NOT NULL,
    arrival_time         TIME   NULL,
    departure_time       TIME   NULL,
    distance_from_origin INT    NOT NULL,
    FOREIGN KEY (train_id)   REFERENCES trains(train_id)   ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

-- 7. Coaches
CREATE TABLE coaches (
    coach_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    train_id     BIGINT      NOT NULL,
    coach_number VARCHAR(20) NOT NULL,
    coach_type   ENUM('SL','3A','2A','1A') NOT NULL,
    total_seats  INT         NOT NULL,
    FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE
);

-- 8. Bookings
CREATE TABLE bookings (
    booking_id             BIGINT        PRIMARY KEY AUTO_INCREMENT,
    user_id                BIGINT        NOT NULL,
    train_id               BIGINT        NOT NULL,
    journey_date           DATE          NOT NULL,
    source_station_id      BIGINT        NOT NULL,
    destination_station_id BIGINT        NOT NULL,
    total_amount           DECIMAL(10,2) NOT NULL,
    booking_status         ENUM('CONFIRMED','CANCELLED') DEFAULT 'CONFIRMED',
    pnr                    VARCHAR(20)   UNIQUE NOT NULL,
    created_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(user_id),
    FOREIGN KEY (train_id) REFERENCES trains(train_id)
);

-- 9. Seat Bookings (journey_date added for performance)
CREATE TABLE seat_bookings (
    seat_booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id      BIGINT NOT NULL,
    train_id        BIGINT NOT NULL,
    coach_id        BIGINT NOT NULL,
    seat_no         INT    NOT NULL,
    from_station_id BIGINT NOT NULL,
    to_station_id   BIGINT NOT NULL,
    from_seq        INT    NOT NULL,
    to_seq          INT    NOT NULL,
    journey_date    DATE   NOT NULL,
    status          ENUM('CONFIRMED','CANCELLED') DEFAULT 'CONFIRMED',
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id)   REFERENCES coaches(coach_id)
);

-- 10. Booking Passengers
CREATE TABLE booking_passengers (
    passenger_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id     BIGINT       NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    age            INT          NOT NULL,
    gender         ENUM('M','F','OTHER'),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- 11. Passenger Seat Mapping
CREATE TABLE passenger_seat_map (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    passenger_id    BIGINT NOT NULL,
    seat_booking_id BIGINT NOT NULL,
    FOREIGN KEY (passenger_id)    REFERENCES booking_passengers(passenger_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_booking_id) REFERENCES seat_bookings(seat_booking_id)   ON DELETE CASCADE
);