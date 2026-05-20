require("dotenv").config();

//--- Import the express server + cors to get started ---//
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

//--- This is DB related stuff to connect to the backend ---//
const { Pool } = require("pg");
const pool = new Pool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//--- This is for password encryption ---//
const bcrypt = require("bcrypt");

//JWT import
const jwt = require("jsonwebtoken");
const SECRET_STRING = process.env.SECRET_STR;

//--- Websockets Set up ---//
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);

//--- Redis client --- //
const redis = require('redis');
const redisClient = redis.createClient({
  socket: { reconnectStrategy: false }
});

redisClient.on('error', (err)=> console.error('Redis error: ', err.message));
//--- Add catch as this is the top of commonJS, so the little delay is negligable ---//
redisClient.connect().catch((err)=>{
  console.error('Redis connection has failed: ', err.message);
});


//--- Status errors for API endpoints. A reusable function that extends Error class ---//
class StatusError extends Error {
  constructor(message, statusCode, err) {
    super(message);
    this.statusCode = statusCode;
    this.code = err;
  }
}

//--- AUTH SECTION -> endpoints in this section: [ Register, Login, Reset password ] ---//
//Reusable query that checks Email existance
const emailExists = async (email) => {
  const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (userExists.rows.length === 0) {
    throw new StatusError(
      "User not Found, Registration needed",
      404,
      "USER_NOT_FOUND",
    );
  }
  return userExists.rows[0]; // Fixed: return the user row so login can use it
};

//--- JWT + token verification and validation ---//
const tokenAuthentication = (req, res, next) => {
  //get authorization header from the request
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(
      new StatusError("Access-Token missing", 401, "ACCESS_TOKEN_MISSING"),
    ); // Fixed: use next() instead of throw inside callback
  }
  jwt.verify(token, SECRET_STRING, (error, user) => {
    if (error) {
      return next(
        new StatusError(
          "Error occured in Token verification step",
          401,
          "TOKEN_VER_ERROR",
        ),
      ); // Fixed: use next() instead of throw inside async callback
    }
    req.user = user; //This allows me to acces this user in later routes
    next();
  });
};

//--- AUTH SECTION  --- This is the register endpoint ---//
app.post("/registerUser", async (req, res, next) => {
  const { name, email, password } = req.body;

  //--- Add redis key to track number of time user has tried registering ---//
  const key = `registerFailed${email}`;
  const attemptNumber = parseInt(await redisClient.get(key)) || 0;

  if(attemptNumber >= 5){
    return next(new StatusError("Too many registration requests", 429, "REDIS_LIMIT_REACHED"));
  }
  try {
    //- First check if user already exists in the DB
    const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      throw new StatusError("User already exists", 409, "USER_ALREADY_EXISTS");
    }

    //If user does not already exist add them to DB, but first encrypt their password
    const encryptedPassword = await bcrypt.hash(password, 10);

    const created_at = new Date().toISOString(); // Fixed: toISOString is a function, needs ()
    await pool.query(
      "INSERT INTO users (name, email, password_hash, created_at) VALUES ($1, $2, $3, $4)", // Fixed: correct SQL syntax + correct column name password_hash
      [name, email, encryptedPassword, created_at],
    );

    const token = jwt.sign({ email },SECRET_STRING, { expiresIn: "24h" },);

    //Finally, add the user to the DB - they have an account now
    await redisClient.del(key);
    res
      .status(200)
      .json({ success: true, message: "User successfully added to the DB", token });
  } catch (error) {
    if(error.statusCode === 409){
      await redisClient.incr(key);
      await redisClient.expire(key, 60);
    }
    next(error);
  }
});

//--- AUTH SECTION  --- This is the login endpoint ---//
app.post("/userLogin", async (req, res, next) => {
  // Fixed: changed GET to POST, body doesn't work on GET
  const { email, password } = req.body;

  //--- Add redis key to track number of time user has tried logging in ---//
  const key = `failedLogin${email}`;
  const attemptNumber = parseInt(await redisClient.get(key)) || 0;
  if(attemptNumber >= 5){
    return next(new StatusError("Too many login requests", 429, "REDIS_LIMIT_REACHED"));
  }

  try {
    // Check if the user/email exists in the DB
    const user = await emailExists(email); // Fixed: capture the returned user row

    //If the user exists, perform validation
    const validatePassword = await bcrypt.compare(password, user.password_hash); // Fixed: use returned user object and correct column name
    if (!validatePassword) {
       throw new StatusError("Password does not match!", 401, "UNAUTHORIZED");
    }
    // Generate JWT token on successful login
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET_STRING,
      { expiresIn: "24h" },
    );
    await redisClient.del(key);
    res.status(200).json({ success: true, message: "User authorized!", token });
  } catch (error) {
    if(error.statusCode === 401 || error.statusCode === 404){
         await redisClient.incr(key);
         await redisClient.expire(key, 60);
    }
    next(error);
  }
});

//--- AUTH SECTION --- This is Password Reset endpoint ---//
app.post("/resetPassword", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    //First check if the email exists
    const user = await emailExists(email); // Fixed: use emailExists helper and capture user

    //Prevent same password
    const samePassword = await bcrypt.compare(password, user.password_hash); // Fixed: use returned user object
    if (samePassword) {
      // Fixed: throw if it IS the same password
      throw new StatusError(
        "Same passwords not allowed!",
        422,
        "SAME_PASSWORD_ERROR",
      );
    }

    // Hash the new password before saving
    const encryptedPassword = await bcrypt.hash(password, 10); // Fixed: was saving plain text password
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [
      encryptedPassword,
      email,
    ]); // Fixed: pool.query() not pool(), and hash the password

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

//--- This is the endpoint that returns the current logged in user ---//
app.get("/userInfo", tokenAuthentication, async (req, res, next) => {
  const { email } = req.user;
  try {
    const currUser = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = currUser.rows[0];
    res
      .status(200)
      .json({
        success: true,
        message: "Sending the current user's info",
        userName: user.name,
        userEml: user.email,
        role: user.role,
      });
  } catch (error) {
    next(error);
  }
});

//--- This is for user's profile. Return all the rooms they have scheduled, if any ---//
app.get("/usersScheduledRooms", tokenAuthentication, async (req, res, next) => {
  const { email } = req.user;
  try {
    const userInfo = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const userId = userInfo.rows[0].id;
    const bookingByUserId = await pool.query(
      "SELECT * FROM bookings WHERE user_id = $1",
      [userId],
    );
    res.status(200).json({ sucess: true, userBookings: bookingByUserId.rows });
  } catch (error) {
    next(error);
  }
});

//--- Room endpoints - These andpoints all require tokens ---//
//--- This endpoint returns a list of all the rooms to dispaly on users' dashboards  ---//
app.get("/roomList", tokenAuthentication, async (req, res, next) => {
  try {
    const cached = await redisClient.get('roomList');
    if(cached){
      return res.status(200)
      .json({success: true,
        message: "Returning rooms list from cache",
        rooms: JSON.parse(cached),
      });
    }
    
    const rooms = await pool.query(`
            SELECT DISTINCT ON (r.id) r.*, b.status
            FROM rooms r
            LEFT JOIN bookings b ON r.id = b.room_id
            ORDER BY r.id, b.start_time DESC NULLS LAST
            `);
    
    await redisClient.set('roomList', JSON.stringify(rooms.rows), {EX: 60});
    res
      .status(200)
      .json({
        success: true,
        message: "Rooms found, returning all rooms",
        rooms: rooms.rows,
      });
  } catch (error) {
    next(error);
  }
});

//--- This endpoint receives the date, start_time, end_time, user_id, etc from frontend to request a booking ---//
app.post("/requestBooking", tokenAuthentication, async (req, res, next) => {
  const { email } = req.user;
  const { room_id, start_time, end_time } = req.body;

  const key = `requestBookingFailed${email}`;
  const attemptNumber = parseInt(await redisClient.get(key)) || 0;
  if(attemptNumber >= 3){
      return next (new StatusError('Too many requests for a booking.', 429, "REDIS_BOOKING_REQUEST_LIMIT_REACHED"));
  };
  try {
    //--- Validate days as well and prevent bookings on the weekend ---//
    const sentDate = new Date(start_time);
    const getDay = sentDate.getDay();
    if (getDay === 0 || getDay === 6) {

      return next(
        new StatusError(
          "Bookings are closed on the weekends.",
          422,
          "BOOKINGS_ON_WEEKENDS",
        ),
      );
    }

    // --- Extract the times for validation --- //
    const start = new Date(start_time);
    const end = new Date(end_time);
    const startHr = start.getHours();
    const endHr = end.getHours();
    if (startHr < 9 || endHr > 17 || (endHr === 17 && end.getMinutes() > 0)) {
      return next(
        new StatusError(
          "Selected times are outside operating hours",
          422,
          "OUTSIDE_OPERATING_HOURS",
        ),
      );
    }

    //First get the ID
    const userInfo = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const userId = userInfo.rows[0].id;

    //Before inserting, check against tentative and confirmed bookings only
    const checkRoomSchedules = await pool.query(
      `
            SELECT * FROM bookings WHERE room_id = $1
            AND status IN ('tentative', 'confirmed')
            AND start_time < $3
            AND end_time > $2
            `,
      [room_id, start_time, end_time],
    );

    if (checkRoomSchedules.rows.length > 0) {
      await redisClient.incr(key);
      await redisClient.expire(key, 60);
      return res
        .status(409)
        .json({
          success: false,
          message: "Time slot conflicts with an existing booking.",
          conflicts: checkRoomSchedules.rows,
        });
    }

    const booking = await pool.query(
      `INSERT INTO bookings (user_id, room_id, start_time, end_time, expires_at) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
      [
        userId,
        room_id,
        start_time,
        end_time,
        new Date(Date.now() + 10 * 60 * 1000),
      ],
    );
    await redisClient.del('roomList');

    //--- Emit after the request is successfully made ---//
    io.emit("booking:updated", {
        action: "created",
        room_id,
        bookingId: booking.rows[0].id,
        status: booking.rows[0].status,
        user: { id: userId, name: userInfo.rows[0].name },
        at: new Date().toISOString(),
    });


    await redisClient.del(key);
    res
      .status(201)
      .json({
        success: true,
        message: "Tentative booking created",
        bookDetails: booking.rows[0],
      });
  } catch (error) {
    next(error);
  }
});

io.on("connect", (socket) => {
  console.log("user connected: ", socket.id);

  socket.on("userConnected", (data) => {
    console.log("frontend sent this:", data);
  });
});

//--- This returns the booking details for a specific, selected room from bookings table ---//
app.get(
  "/roomScheduleInfo/:id",
  tokenAuthentication,
  async (req, res, next) => {
    const { id } = req.params;
    try {
      const roomSchedules = await pool.query(
        `SELECT * FROM bookings WHERE room_id = $1`,
        [id],
      );
      res
        .status(200)
        .json({ success: true, room_schedule_details: roomSchedules.rows });
    } catch (error) {
      next(error);
    }
  },
);

//--- Endpoint to allow users to cancel their confirmed ---//
app.post("/cancelBooking", tokenAuthentication, async (req, res, next) => {
  const { id } = req.body;
  try {
    const cancelConf = await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING *", [
      id, req.user.id
    ]);

    //--- Emit after the booking is successfully cancelled ---//
    io.emit("cancel:booking", {
      room_id: cancelConf.rows[0].room_id
    })

    await redisClient.del('roomList');

    res
      .status(200)
      .json({ success: true, message: "Booking Successfully cancelled.", cancelledInfo: cancelConf.rows[0]});
  } catch (error) {
    next(error);
  }
});

//--- Confirm a room booking and update the BD ---//
app.patch(
  "/confirmBooking/:id",
  tokenAuthentication,
  async (req, res, next) => {
    const { id } = req.params;
    try {
      const confirmation = await pool.query(
        `
            UPDATE bookings SET status = $1 WHERE id = $2 
            AND status = $3 
            AND expires_at > NOW()
            RETURNING *
            `,
        ["confirmed", id, "tentative"],
      );

      if(confirmation.rows.length === 0){
         return res.status(410).json({ success: false, message: "Booking can't be confirmed (already confirmed or expired)." }); 
      }

      //--- Send live update when user confirms their booking ---//
      //Get the user name and details from confirmation to send
      const userId = confirmation.rows[0].user_id;
      const userInfo = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

      //--- Emit after the request is successfully confirmed ---//
      io.emit('user-confirmed-booking', {
         userName: userInfo.rows[0].name,
         room_id: confirmation.rows[0].room_id,
         bookingId: confirmation.rows[0].id
      });


      await redisClient.del('roomList');

      res
        .status(200)
        .json({
          success: true,
          message: "Booking successfully confirmed.",
          bookingConfirmation: confirmation.rows[0],
        });
    } catch (error) {
      next(error);
    }
  },
);




//------------------ ADMIN related endpoints -------------------//
//--- This is the middleware that checks if currently logged in user is admin ---//
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new StatusError("Forbidden", 403, "FORBIDDEN"));
  }
  next();
};

//--- For admin only to create a room ---//
app.post(
  "/createRoomAdmin",
  tokenAuthentication,
  isAdmin,
  async (req, res, next) => {
    const { name, capacity, purpose } = req.body;
    try {
      if (capacity > 20) {
        return next(
          new StatusError(
            "Room capacity cannot exceed 20",
            422,
            "CAPACITY_EXCEEDED",
          ),
        );
      }
      await pool.query(
        "INSERT INTO rooms (name, capacity, purpose) VALUES ($1, $2, $3)",
        [name, capacity, purpose],
      );

      await redisClient.del('roomList');

      res
        .status(200)
        .json({ success: true, message: "Admin Successfully created a room." });
    } catch (error) {
      next(error);
    }
  },
);
//--- For admin only to delete a room ---//
app.delete(
  "/deleteRoomAdmin/:id",
  tokenAuthentication,
  isAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM rooms WHERE id = $1", [id]);

      await redisClient.del('roomList');

      res
        .status(200)
        .json({ success: true, message: "Admin successfully removed a room." });
    } catch (error) {
      next(error);
    }
  },
);

//--- For admin only to update a room ---//
app.patch(
  "/updateRoomAdmin/:id",
  tokenAuthentication,
  isAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    const { name, capacity, purpose } = req.body;
    try {
      const update = await pool.query(
        `
            UPDATE rooms 
            SET name = COALESCE($1, name),
            capacity = COALESCE($2, capacity),
            purpose  =  COALESCE($3, purpose)
            WHERE id = $4
            RETURNING *
            `,
        [name, capacity, purpose, id],
      );

      await redisClient.del('roomList');

      res
        .status(200)
        .json({
          success: true,
          message: "Admin successfully updated a room. Returning updated room",
          updatedRoom: update.rows[0],
        });
    } catch (error) {
      next(error);
    }
  },
);

//--- This is the worker that periodically checks the DB and updates bookings statuses
const expiryJob = setInterval(async () => {
  const result = await pool.query(`
    UPDATE bookings 
    SET status = 'cancelled' 
    WHERE expires_at < NOW() 
    AND status = 'tentative' RETURNING *`);

    //--- Invalidate cache as every 30 seconds it flips status accordingly ---//
    if(result.rows.length > 0){
      await redisClient.del('roomList');
    }
   

}, 30000);
// --- Listen for server restart or server kill and stop the background worker --- //
process.on("SIGTERM", () => clearInterval(expiryJob));
process.on("SIGINT", () => clearInterval(expiryJob));

// --- Error Block for readability and reusability --- ///
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "Internal server error",
  });
});

server.listen(4001, () => {
  console.log("Server is running on: http://localhost:4001/");
});
