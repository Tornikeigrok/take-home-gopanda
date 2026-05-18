require('dotenv').config()

//--- Import the express server + cors to get started ---//
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

//--- This is DB related stuff to connect to the backend ---//
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


//--- This is for password encryption ---//
const bcrypt = require('bcrypt');


//JWT import
const jwt = require('jsonwebtoken');
const SECRET_STRING = process.env.SECRET_STR;




//--- Status errors for API endpoints. A reusable function that extends Error class ---//
class StatusError extends Error{
   constructor(message, statusCode, err){
    super(message);
    this.statusCode = statusCode;
    this.err = err;
   }
}

//--- AUTH SECTION -> endpoints in this section: [ Register, Login, Reset password ] ---//
//Reusable query that checks Email existance
const emailExists = async (email) => {
    const userExists = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    if(userExists.rows.length === 0){
        throw new StatusError(
            "User not Found, Registration needed",
            404,
            "USER_NOT_FOUND"
        );
    }
    return userExists.rows[0]; // Fixed: return the user row so login can use it
}

//--- JWT + token verification and validation ---//
const tokenAuthentication = (req, res, next)=>{
    //get authorization header from the request
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if(!token){
        return next(new StatusError("Access-Token missing", 401, "ACCESS_TOKEN_MISSING")); // Fixed: use next() instead of throw inside callback
    }
    jwt.verify(token, SECRET_STRING, (error, user)=>{
        if(error){
            return next(new StatusError(
                "Error occured in Token verification step", 
                401, 
                "TOKEN_VER_ERROR"
            )); // Fixed: use next() instead of throw inside async callback
        }
        req.user = user; //This allows me to acces this user in later routes
        next();
    })
}


//--- AUTH SECTION  --- This is the register endpoint ---//
app.post("/registerUser", async(req, res, next)=>{
    const {name, email, password} = req.body;
    try {
        //- First check if user already exists in the DB
        const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [email]);
        if(existing.rows.length > 0){ // Fixed: for register we throw if user DOES exist, not if they don't
            throw new StatusError("User already exists", 409, "USER_ALREADY_EXISTS");
        }

        //If user does not already exist add them to DB, but first encrypt their password 
        const encryptedPassword = await bcrypt.hash(password, 10);

        const created_at = new Date().toISOString(); // Fixed: toISOString is a function, needs ()
        await pool.query("INSERT INTO users (name, email, password_hash, created_at) VALUES ($1, $2, $3, $4)", // Fixed: correct SQL syntax + correct column name password_hash
            [name, email, encryptedPassword, created_at]);

        //Finally, add the user to the DB - they have an account now
        res.status(200).json({success: true,  message: "User successfully added to the DB"});
    } catch (error) {
        next(error);
    }
});

//--- AUTH SECTION  --- This is the login endpoint ---//
app.post("/userLogin", async(req, res, next)=>{ // Fixed: changed GET to POST, body doesn't work on GET
    const {email, password} = req.body;
    try {
        // Check if the user/email exists in the DB
        const user = await emailExists(email); // Fixed: capture the returned user row

        //If the user exists, perform validation
        const validatePassword = await bcrypt.compare(password, user.password_hash); // Fixed: use returned user object and correct column name
        if(!validatePassword){
            throw new StatusError("Password does not match!", 401, "UNAUTHORIZED");
        }

        // Generate JWT token on successful login
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_STRING,
            { expiresIn: '24h' }
        );
        res.status(200).json({success: true, message: "User authorized!", token});
    } catch (error) {
        next(error);
    }
});


//--- AUTH SECTION --- This is Password Reset endpoint ---//
app.post("/resetPassword", async(req, res, next)=>{
    const {email, password} = req.body;
    try {
        //First check if the email exists
        const user = await emailExists(email); // Fixed: use emailExists helper and capture user
        
        //Prevent same password
        const samePassword = await bcrypt.compare(password, user.password_hash); // Fixed: use returned user object
        if(samePassword){ // Fixed: throw if it IS the same password
            throw new StatusError("Same passwords not allowed!", 422, "SAME_PASSWORD_ERROR");
        }

        // Hash the new password before saving
        const encryptedPassword = await bcrypt.hash(password, 10); // Fixed: was saving plain text password
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [encryptedPassword, email]); // Fixed: pool.query() not pool(), and hash the password

        res.status(200).json({success: true, message: "Password updated successfully"});
    } catch (error) {
        next(error);
    }
})

//--- This is the endpoint that returns the current logged in user ---//
app.get("/userInfo", tokenAuthentication, async(req, res, next)=>{
    const {email} = req.user;
    try {
        const currUser = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = currUser.rows[0];
        res.status(200).json({success: true, message: "Sending the current user's info", userName: user.name, userEml: user.email, role: user.role});
    } catch (error) {
        next(error);
    }
})


//--- This is for user's profile. Return all the rooms they have scheduled, if any ---//
app.get("/usersScheduledRooms", tokenAuthentication, async(req, res, next)=>{
    const {email} = req.user;
    try {
        const userInfo = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const userId = userInfo.rows[0].id;
        const bookingByUserId = await pool.query("SELECT * FROM bookings WHERE user_id = $1", [userId]);
        res.status(200).json({sucess: true, userBookings: bookingByUserId.rows});
    } catch (error) {
        next(error);
    }
})



//--- Room endpoints - These andpoints all require tokens ---//
//--- This endpoint returns a list of all the rooms to dispaly on users' dashboards  ---//
app.get("/roomList", tokenAuthentication, async(req, res, next)=>{
    try {
         const rooms = await pool.query(`
            SELECT DISTINCT ON (r.id) r.*, b.status
            FROM rooms r
            LEFT JOIN bookings b ON r.id = b.room_id
            ORDER BY r.id, b.start_time DESC NULLS LAST
            `);
        res.status(200).json({success: true, message: "Rooms found, returning all rooms", rooms: rooms.rows})
    } catch (error) {
        next(error);
    }
})

//--- This endpoint receives the date, start_time, end_time, user_id, etc from frontend to request a booking ---//
app.post("/requestBooking", tokenAuthentication, async(req, res, next)=>{
    const {email} = req.user;
    const {room_id, start_time, end_time} = req.body;
    try {   
        //First get the ID
        const userInfo = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const userId = userInfo.rows[0].id;


        //Before inserting, check against tentative and confirmed bookings only
        const checkRoomSchedules = await pool.query(`
            SELECT * FROM bookings WHERE room_id = $1
            AND status IN ('tentative', 'confirmed')
            AND start_time < $3
            AND end_time > $2
            `, [room_id, start_time, end_time]);

        if(checkRoomSchedules.rows.length > 0){
            return res.status(409).json({ success: false, message: "Time slot conflicts with an existing booking.", conflicts: checkRoomSchedules.rows });
        }

        const booking = await pool.query(`INSERT INTO bookings (user_id, room_id, start_time, end_time, expires_at) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `, [userId, 
                room_id, 
                start_time, 
                end_time, 
                new Date(Date.now() + 10 * 60 * 1000)
        ]);
        res.status(201).json({ success: true, message: "Tentative booking created", bookDetails: booking.rows[0]});
    } catch (error) {
        next(error);
    }
});


//--- This returns the booking details for a specific, selected room from bookings table ---//
app.get("/roomScheduleInfo/:id", tokenAuthentication, async(req, res, next)=>{
    const {id} = req.params;
    try {  
        const roomSchedules = await pool.query(`SELECT * FROM bookings WHERE room_id = $1`, [id]);
        res.status(200).json({success: true, room_schedule_details: roomSchedules.rows});
    } catch (error) {
        next(error);
    }
});


//--- Endpoint to allow users to cancel their confirmed ---//
app.post("/cancelBooking", tokenAuthentication, async(req, res, next)=>{
    const {id} = req.body;
    try {
        await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
        res.status(200).json({success: true, message: "Booking Successfully cancelled."});
    } catch (error) {
        next(error);
    }
})


//--- Confirm a room booking and update the BD ---//
app.patch("/confirmBooking/:id", tokenAuthentication, async(req, res, next)=>{
    const {id} = req.params;
    try {
        const confirmation = await pool.query(`
            UPDATE bookings SET status = $1 WHERE id = $2 
            AND status = $3 
            AND expires_at > NOW()
            RETURNING *
            `, ['confirmed', id, 'tentative']);
        res.status(200).json({success: true, message: "Booking successfully confirmed.", bookingConfirmation: confirmation.rows[0]});
    } catch (error) {
        next(error);
    }
});




//------------------ ADMIN related endpoints -------------------//
//--- This is the middleware that checks if currently logged in user is admin ---//
const isAdmin = (req, res, next)=>{
    if(req.user.role !== 'admin'){
        return next(new StatusError("Forbidden", 403, "FORBIDDEN"));
    }
    next();
}

//--- For admin only to create a room ---//
app.post("/createRoomAdmin", tokenAuthentication, isAdmin, async(req, res, next)=>{
    const {name, capacity, purpose} = req.body;
    try {
        if(capacity > 20){
            return next(new StatusError("Room capacity cannot exceed 20", 422, "CAPACITY_EXCEEDED"));
        }
        await pool.query("INSERT INTO rooms (name, capacity, purpose) VALUES ($1, $2, $3)", 
            [name, capacity, purpose]);

        res.status(200).json({success: true, message: "Admin Successfully created a room."});
    } catch (error) {
        next(error);
    }
});
//--- For admin only to delete a room ---//
app.delete("/deleteRoomAdmin/:id", tokenAuthentication, isAdmin, async(req, res, next)=>{
    const {id} = req.params;
    try {
        await pool.query("DELETE FROM rooms WHERE id = $1", [id]);
        res.status(200).json({success: true, message: "Admin successfully removed a room."});
    } catch (error) {
        next(error);
    }
});


//--- For admin only to update a room ---//
app.patch("/updateRoomAdmin/:id", tokenAuthentication, isAdmin, async(req, res, next)=>{
    const {id} = req.params;
    const {name, capacity, purpose} = req.body;
    try {
        const update = await pool.query(`
            UPDATE rooms 
            SET name = COALESCE($1, name),
            capacity = COALESCE($2, capacity),
            purpose  =  COALESCE($3, purpose)
            WHERE id = $4
            RETURNING *
            `, [name, capacity, purpose, id]);
        res.status(200).json({success: true, message: "Admin successfully updated a room. Returning updated room", updatedRoom: update.rows[0]});
    } catch (error) {
        next(error);
    }
})


//--- This is the worker that periodically checks the DB and updates bookings statuses
const expiryJob = setInterval(async()=>{
  await pool.query(`
    UPDATE bookings 
    SET status = 'cancelled' 
    WHERE expires_at < NOW() 
    AND status = 'tentative'`);
}, 30000);

process.on('SIGTERM', ()=> clearInterval(expiryJob));
process.on('SIGINT', ()=> clearInterval(expiryJob));


// --- Error Block for readability and reusability --- ///
app.use((err, req, res, next) => {
   res.status(err.statusCode || 500).json({
      success: false,
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "Internal server error"
   });
});

app.listen(4001, ()=>{
    console.log("Server is running on: http://localhost:4001/");
})