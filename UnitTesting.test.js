/* ---
  After running `node seed.js`, the seed will generate new IDs for rooms and users.
  Please update the following values in this file to match your seeded data:

  1. In beforeAll + afterAll:
     - room_id in the DELETE and INSERT queries (currently 30) 
       → replace with the ID of "Design Studio" from your rooms table

  2. In beforeAll INSERT:
     - user_id (currently 78) 
       → replace with the ID of "Alice Johnson" from your users table

  3. In the overlap tests (room_id: 30):
     → replace with the ID of "Design Studio" from your rooms table

  4. In the weekend test (room_id: 30):
     → replace with any valid room ID from your rooms table

  5. In the concurrency test (room_id: 30):
     → replace with any valid room ID from your rooms table

--- */


//--- Get the supertest package and DB connection, as well as the env details ---//
const request = require('supertest');
const { Pool } = require('pg');
const URL = "http://localhost:4001/";
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//--- Every endpoint besides AUTH endpoints need a valid token ---//
let token;
//--- This is to make sure that DB is never empty and a valid token is always present ---//
beforeAll(async () => {
  const redis = require('redis');
  const redisClient = redis.createClient();
  await redisClient.connect();
  await redisClient.del('requestBookingFailedbob@gopanda.com');
  await redisClient.quit();

  //--- Clean up test data ---//
  await pool.query(`DELETE FROM users WHERE email = 'jonathansd22@gmail.com'`);
  await pool.query(`DELETE FROM bookings WHERE room_id = 30 AND start_time = '2026-05-20T12:00:00'`);

  //--- Seed a known confirmed booking to test overlaps against ---//
  await pool.query(`DELETE FROM bookings WHERE room_id = 30 AND start_time = '2026-05-21T14:00:00'`);
  await pool.query(`
    INSERT INTO bookings (room_id, user_id, start_time, end_time, status)
    VALUES (30, 78, '2026-05-21T14:00:00', '2026-05-21T16:00:00', 'confirmed')
  `);

  // --- Get auth token ---//
  const res = await request(URL).post("userLogin").send({
    email: "bob@gopanda.com",
    password: "member123"
  });
  token = res.body.token;
});

afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE email = 'jonathansd22@gmail.com'`);
  await pool.query(`DELETE FROM bookings WHERE room_id = 30 AND start_time = '2026-05-20T12:00:00'`);
  await pool.query(`DELETE FROM bookings WHERE room_id = 30 AND start_time = '2026-05-21T14:00:00'`);
  await pool.end();
});




//--- Unit Testing AUTH endpoints ---//
test("POST / registerUser - should return 409 if the email already exists", async () => {
  const res = await request(URL).post("registerUser").send({
    email: "bob@gopanda.com",
    password: "Password123"
  });
  expect(res.status).toBe(409);
});

test("POST / userLogin - Should return 401 if the password is not valid", async () => {
  const res = await request(URL).post("userLogin").send({
    email: 'bob@gopanda.com',
    password: "wrongpassword"
  });
  expect(res.status).toBe(401);
});


//--- Commenting this out while testing as it changes password on every run. Please uncomment to test ---//

// test("POST / resetPassword - Should return 404 if the email does not exist", async () => {
//   const res = await request(URL).post("resetPassword").send({
//     email: 'dsdfsdfsds@gmail.com',
//     password: "passwordnew123"
//   });
//   expect(res.status).toBe(404);
// });


test("POST / userRegister - Should return 200 if the email is not already present", async () => {
  const res = await request(URL).post("registerUser").send({
    name: "jonathan williams",
    email: "jonathansd22@gmail.com",
    password: "password22222"
  });
  expect(res.status).toBe(200);
});

test("POST / userLogin - Should return 200 if the credentials match", async () => {
  const res = await request(URL).post("userLogin").send({
    email: "bob@gopanda.com",
    password: "member123"
  });
  expect(res.status).toBe(200);
});





//--- Unit tests for conflict detection ---//
test("Should return 409 when overlap is detected", async () => {
  const res = await request(URL).post("requestBooking").set("Authorization", `Bearer ${token}`).send({
    room_id: 30,
    start_time: "2026-05-21T14:00:00",
    end_time: "2026-05-21T16:00:00"
  });
  expect(res.status).toBe(409);
});

test("Should return 409 when the new booking partially overlaps", async () => {
  const res = await request(URL).post("requestBooking").set('Authorization', `Bearer ${token}`).send({
    room_id: 30,
    start_time: "2026-05-21T15:00:00",
    end_time: "2026-05-21T17:00:00"
  });
  expect(res.status).toBe(409);
});

test("POST Should return 422 if the booking is on the weekends", async () => {
  const res = await request(URL).post('requestBooking').set('Authorization', `Bearer ${token}`).send({
    room_id: 30,
    start_time: "2026-05-23T14:00:00",
    end_time: "2026-05-23T15:00:00"
  });
  expect(res.status).toBe(422);
});




//--- Integration Test: Concurrency Check. Only one of them will make a successfull request because of 'FOR PDATE' ---//
test('POST should return overlapping error if user B makes the request first', async () => {
  const booking = {
    room_id: 30,
    start_time: "2026-05-20T12:00:00",
    end_time: "2026-05-20T13:00:00"
  };

  const [userA, userB] = await Promise.all([
    request(URL).post('requestBooking').set('Authorization', `Bearer ${token}`).send(booking),
    request(URL).post('requestBooking').set('Authorization', `Bearer ${token}`).send(booking),
  ]);

  const status = [userA.status, userB.status].sort();
  expect(status).toEqual([201, 409]);
});