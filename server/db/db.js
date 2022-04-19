const Sequelize = require("sequelize");
require("dotenv").config();
const { PG_PASSWORD } = process.env;

const db = new Sequelize('messenger', 'postgres', PG_PASSWORD, {
  host: 'localhost',
  dialect: 'postgres'
});

module.exports = db;
