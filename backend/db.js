require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  port:               process.env.DB_PORT,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  ssl: {
    ca: process.env.DB_CA_CERT,
  },
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

module.exports = pool;