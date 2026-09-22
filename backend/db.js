require("dotenv").config();
const mysql = require("mysql2/promise");

// Only enable TLS when a CA is supplied. Passing `ssl: { ca: undefined }`
// still negotiates TLS, which breaks a plain local MySQL.
const ssl = process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : undefined;

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               process.env.DB_PORT,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  ssl,
  // Return DATE columns as 'YYYY-MM-DD' strings. Converted to JS Dates they
  // become local midnight, which JSON-serialises to a UTC timestamp hours
  // earlier — so a journey on the 23rd reaches the client reading as the 22nd.
  dateStrings:        ["DATE"],
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

module.exports = pool;
