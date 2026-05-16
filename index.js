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




app.listen(4001, ()=>{
    console.log("Server is running on: http://localhost:4001/");
})