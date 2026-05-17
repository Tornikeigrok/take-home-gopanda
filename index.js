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
        res.status(200).json({success: true, message: "Sending the current user's info", userName: user.name, userEml: user.email});
    } catch (error) {
        next(error);
    }
})


//--- Room endpoints - These andpoints all require tokens ---//

//This endpoint returns a list of all the rooms to dispaly on users' dashboards 
app.get("/roomList", tokenAuthentication, async(req, res, next)=>{
    try {
        const rooms = await pool.query("SELECT * FROM rooms");
        res.status(200).json({success: true, message: "Rooms found, returning all rooms", rooms: rooms.rows})
    } catch (error) {
        next(error);
    }
})



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