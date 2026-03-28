const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const logger = require("../utils/logger");

const databasePath = path.join(__dirname, "../../db/usuarios.db");

const db = new sqlite3.Database(
  databasePath,
  (err) => {
    if (err) {
      logger.error("Error conectando a la base de datos SQLite", {
        error: err.message,
        databasePath,
      });
    } else {
      logger.info("Conectado a la base de datos SQLite");
    }
  },
);

module.exports = db;
