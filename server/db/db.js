const Sequelize = require("sequelize");
require("dotenv").config();
const { PG_PASSWORD } = process.env;

const db = new Sequelize(process.env.DATABASE_URL || `postgres://postgres:${PG_PASSWORD}@localhost:5432/messenger`, {
  logging: false
});

module.exports = db;
