require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const seed = async () => {
  try {
    console.log("Starting seed...");

    // --- Clear existing data in correct order (bookings first due to foreign keys) ---//
    await pool.query("DELETE FROM bookings");
    await pool.query("DELETE FROM rooms");
    await pool.query("DELETE FROM users");
    console.log("Cleared existing data");

    // --- Seed Users: 1 admin + 2 members ---//
    const adminPassword = await bcrypt.hash("admin123", 10);
    const member1Password = await bcrypt.hash("member123", 10);
    const member2Password = await bcrypt.hash("member123", 10);

    const usersResult = await pool.query(
      `
            INSERT INTO users (name, email, password_hash, role, created_at)
            VALUES
                ('Admin User',  'admin@gopanda.com',   $1, 'admin',  NOW()),
                ('Alice Johnson', 'alice@gopanda.com', $2, 'member', NOW()),
                ('Bob Smith',   'bob@gopanda.com',     $3, 'member', NOW())
            RETURNING id
        `,
      [adminPassword, member1Password, member2Password],
    );

    const adminId = usersResult.rows[0].id;
    const aliceId = usersResult.rows[1].id;
    const bobId = usersResult.rows[2].id;
    console.log(" Seeded users");

    // --- Seed Rooms ---//
    const roomsResult = await pool.query(`
            INSERT INTO rooms (name, capacity, purpose, is_active, created_at)
            VALUES
                ('Design Studio',    6,  'Design room for UI/UX and creative work',         true, NOW()),
                ('Tech Lab',         10, 'Tech room for engineering and development teams',  true, NOW()),
                ('Strategy Room',    4,  'Small room for planning and strategy sessions',    true, NOW()),
                ('Training Center',  20, 'Large room for workshops and training sessions',   true, NOW()),
                ('Focus Pod',        2,  'Quiet room for focused individual or pair work',   true, NOW())
            RETURNING id
        `);

    const designRoomId = roomsResult.rows[0].id;
    const techLabId = roomsResult.rows[1].id;
    const strategyRoomId = roomsResult.rows[2].id;
    const trainingId = roomsResult.rows[3].id;
    const focusPodId = roomsResult.rows[4].id;
    console.log(" Seeded rooms");

    // --- Seed Bookings: mix of confirmed, tentative, cancelled ---//
    const dateStr = new Date().toISOString().split("T")[0];

    await pool.query(
      `
    INSERT INTO bookings (room_id, user_id, start_time, end_time, status, expires_at, created_at, updated_at)
    VALUES
        ($1, $5, $9::date + TIME '09:00', $9::date + TIME '10:00', 'confirmed', NULL,                          NOW(), NOW()),
        ($2, $6, $9::date + TIME '10:00', $9::date + TIME '12:00', 'confirmed', NULL,                          NOW(), NOW()),
        ($3, $7, $9::date + TIME '13:00', $9::date + TIME '14:00', 'confirmed', NULL,                          NOW(), NOW()),
        ($4, $5, $9::date + TIME '14:00', $9::date + TIME '16:00', 'confirmed', NULL,                          NOW(), NOW()),
        ($1, $6, $9::date + TIME '11:00', $9::date + TIME '12:00', 'tentative', NOW() + INTERVAL '10 minutes', NOW(), NOW()),
        ($8, $7, $9::date + TIME '15:00', $9::date + TIME '16:00', 'tentative', NOW() + INTERVAL '5 minutes',  NOW(), NOW()),
        ($2, $7, $9::date + TIME '09:00', $9::date + TIME '10:00', 'cancelled', NULL,                          NOW(), NOW()),
        ($3, $6, $9::date + TIME '10:00', $9::date + TIME '11:00', 'cancelled', NULL,                          NOW(), NOW())
`,
      [
        designRoomId,
        techLabId,
        strategyRoomId,
        trainingId,
        adminId,
        aliceId,
        bobId,
        focusPodId,
        dateStr,
      ],
    );
    console.log("Seeded bookings");

    console.log("");
    console.log("   Seed complete! You can log in with:");
    console.log("   Admin:  admin@gopanda.com  / admin123");
    console.log("   Alice:  alice@gopanda.com  / member123");
    console.log("   Bob:    bob@gopanda.com    / member123");

    await pool.end();
  } catch (error) {
    console.error("Seed failed for some reason:", error);
    await pool.end();
    process.exit(1);
  }
};
seed();
