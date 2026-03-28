const express = require("express");
const validator = require("validator");
const db = require("../config/database");
const logger = require("../utils/logger");

const router = express.Router();

router.post("/crear", async (req, res) => {
  try {
    let { name, price, stock } = req.body;

    logger.debug("Solicitud de creacion de producto recibida", {
      name,
      price,
      stock,
    });

    // Validar nombre del producto
    if (!name || typeof name !== "string") {
      logger.warn("Creacion de producto rechazada por nombre invalido", {
        name,
      });
      return res.status(400).json({ error: "Nombre inválido" });
    }

    if (!validator.isLength(name, { min: 1, max: 100 })) {
      logger.warn("Creacion de producto rechazada por longitud de nombre", {
        name,
      });
      return res.status(400).json({ error: "Nombre muy largo o vacío" });
    }

    // Eliminar HTML y sanitizar el nombre
    name = validator.escape(name);

    // Validar el precio
    if (typeof price !== "number" || price <= 0) {
      logger.warn("Creacion de producto rechazada por precio invalido", {
        name,
        price,
      });
      return res.status(400).json({ error: "Precio inválido" });
    }

    // Validar que la cantidad disponible
    if (!Number.isInteger(stock) || stock < 0) {
      logger.warn("Creacion de producto rechazada por stock invalido", {
        name,
        stock,
      });
      return res.status(400).json({ error: "Stock inválido" });
    }

    const sql = `
      INSERT INTO products (name, price, stock)
      VALUES (?, ?, ?)
    `;

    const result = await new Promise((resolve, reject) => {
      db.run(sql, [name, price, stock], function (err) {
        if (err) reject(err);
        resolve({ id: this.lastID });
      });
    });

    res.status(201).json({
      message: "Producto creado correctamente",
      producto: {
        id: result.id,
        name,
        price,
        stock,
      },
    });
    logger.info("Producto creado correctamente", {
      productId: result.id,
      name,
      price,
      stock,
    });
  } catch (error) {
    logger.error("Error al crear producto", {
      name: req.body?.name,
      price: req.body?.price,
      stock: req.body?.stock,
      error: error.message,
    });
    res.status(500).json({ error: "Error al crear producto" });
  }
});

module.exports = router;
