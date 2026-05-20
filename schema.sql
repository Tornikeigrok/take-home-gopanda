-- Run this once to create the tables, then run `node seed.js` to populate sample data --.

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;


CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    capacity   INTEGER      NOT NULL CHECK (capacity > 0 AND capacity <= 20),
    purpose    TEXT,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id     INTEGER     NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_time  TIMESTAMP   NOT NULL,
    end_time    TIMESTAMP   NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'tentative' CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
    expires_at  TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE INDEX idx_bookings_room_time ON bookings (room_id, start_time, end_time);
CREATE INDEX idx_bookings_user      ON bookings (user_id);
