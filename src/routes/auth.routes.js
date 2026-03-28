const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/database");
const { generateToken } = require("../utils/generateToken");
const { verificarToken, verificarRol } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "[email_invalido]";
  const [userPart, domainPart] = email.split("@");
  if (!domainPart) return "[email_invalido]";
  if (userPart.length <= 2) return `***@${domainPart}`;
  return `${userPart.slice(0, 2)}***@${domainPart}`;
};

// Endpoint de registro
router.post("/registro", async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.debug("Solicitud de registro recibida", {
      email: maskEmail(email),
    });

    // Validar que los datos existan
    if (!email || !password) {
      logger.warn("Registro rechazado por credenciales incompletas", {
        email: maskEmail(email),
      });
      return res.status(400).json({ error: "Credenciales Invalidas" });
    }

    // Validar longitud de la contraseña
    if (password.length <= 8 || password.length >= 10) {
      logger.warn("Registro rechazado por politica de contrasena", {
        email: maskEmail(email),
      });
      return res.status(400).json({ error: "Credenciales Invalidas" });
    }


    const usuarioExistente = await new Promise((resolve, reject) => {
      db.get(
        "SELECT email FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (usuarioExistente) {
      logger.warn("Intento de registro con email ya existente", { email: maskEmail(email) });
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    // Generar hash de la contraseña con bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar nuevo usuario en la BD (el role se asigna 'cliente' por defecto)
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO usuarios (email, password) VALUES (?, ?)",
        [email, hashedPassword],
        function (err) {
          if (err) reject(err);
          resolve(this);
        },
      );
    });

    res.status(201).json({
      message: "Usuario Registrado",
      user: { email, role: "cliente" },
    });
    logger.info("Registro de usuario exitoso", {
      email: maskEmail(email),
      role: "cliente",
    });
  } catch (error) {
    logger.error("Error del sistema en registro", {
      email: maskEmail(req.body?.email),
      error: error.message,
    });
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint de login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.debug("Solicitud de login recibida", {
      email: maskEmail(email),
    });

    // Validar que los datos existan
    if (!email || !password) {
      logger.warn("Login rechazado por credenciales incompletas", {
        email: maskEmail(email),
      });
      return res.status(400).json({ error: "Credenciales Invalidas" });
    }

    // Verificar si el email existe en la BD
    const usuario = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email, password, role FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!usuario) {
      logger.warn("Login fallido por usuario no encontrado", {
        email: maskEmail(email),
      });
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Comparar la contraseña ingresada con el hash almacenado
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      logger.warn("Login fallido por credenciales invalidas", {
        // userId: usuario.id,
        email: maskEmail(email),
      });
      return res.status(401).json({ error: "Credenciales Invalidas" });
    }

    // Generar el token con JWT
    const token = generateToken(usuario);

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token: token,
      user: {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
      },
    });
    logger.info("Inicio de sesión exitoso", {
      userId: usuario.id,
      email: maskEmail(usuario.email),
      role: usuario.role,
    });
  } catch (error) {
    logger.error("Error del sistema en login", {
      email: maskEmail(req.body?.email),
      error: error.message,
    });
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


router.post("/cambiar-password", verificarToken, async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;

    logger.debug("Solicitud de cambio de contrasena recibida", {
      email: maskEmail(email),
      actorId: req.usuario?.id,
    });

    // Validar que el email del token coincida con el de la petición
    if (email !== req.usuario.email) {
      logger.warn("Cambio de contrasena bloqueado por mismatch de identidad", {
        actorId: req.usuario?.id,
        tokenEmail: maskEmail(req.usuario?.email),
        requestedEmail: maskEmail(email),
      });
      return res
        .status(403)
        .json({ error: "No puedes cambiar la contraseña de otro usuario" });
    }

    // Validar que los datos existan
    if (!email || !nuevaPassword) {
      logger.warn("Cambio de contrasena rechazado por datos incompletos", {
        email: maskEmail(email),
      });
      return res
        .status(400)
        .json({ error: "Email y nueva contraseña son requeridos" });
    }

    // Validar longitud de la nueva contraseña
    if (nuevaPassword.length <= 8 || nuevaPassword.length >= 10) {
      logger.warn("Cambio de contrasena rechazado por politica de contrasena", {
        email: maskEmail(email),
      });
      return res
        .status(400)
        .json({ error: "La contraseña debe tener 9 caracteres" });
    }

    const usuarioExistente = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!usuarioExistente) {
      logger.warn("Cambio de contrasena fallido por usuario inexistente", {
        email: maskEmail(email),
      });
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Generar hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

    // Actualizar la contraseña
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE usuarios SET password = ? WHERE email = ?",
        [hashedPassword, email],
        function (err) {
          if (err) reject(err);
          resolve(this);
        },
      );
    });

    res.status(200).json({
      message: "Contraseña actualizada exitosamente",
      user: { email },
    });
    logger.info("Contrasena actualizada exitosamente", {
      email: maskEmail(email),
      userId: usuarioExistente.id,
    });
  } catch (error) {
    logger.error("Error del sistema al cambiar contrasena", {
      email: maskEmail(req.body?.email),
      actorId: req.usuario?.id,
      error: error.message,
    });
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


router.put("/cambiar-rol", verificarToken, verificarRol(["admin"]), async (req, res) => {
    try {
      const { email, nuevoRol } = req.body;

      logger.debug("Solicitud de cambio de rol recibida", {
        actorId: req.usuario?.id,
        targetEmail: maskEmail(email),
        nuevoRol,
      });

      // Validar que los datos existan
      if (!email || !nuevoRol) {
        logger.warn("Cambio de rol rechazado por datos incompletos", {
          actorId: req.usuario?.id,
          targetEmail: maskEmail(email),
        });
        return res
          .status(400)
          .json({ error: "Email y nuevo rol son requeridos" });
      }

      // Validar que el rol sea válido
      const rolesValidos = ["cliente", "admin", "moderador", "limpiapiso"];
      if (!rolesValidos.includes(nuevoRol)) {
        logger.warn("Intento de cambio de rol con rol no válido", {
          email: maskEmail(email),
          nuevoRol,
          actorId: req.usuario?.id,
        });
        return res.status(400).json({
          error: "Rol no válido",
          rolesPermitidos: rolesValidos,
        });
      }

      const usuarioExistente = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id, email, role FROM usuarios WHERE email = ?",
          [email],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          },
        );
      });

      if (!usuarioExistente) {
        logger.warn("Intento de cambio de rol para usuario no encontrado", {
          email: maskEmail(email),
          nuevoRol,
          actorId: req.usuario?.id,
        });
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const rolAnterior = usuarioExistente.role;

      // Consulta para actualizar el rol del usuario
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE usuarios SET role = ? WHERE email = ?",
          [nuevoRol, email],
          function (err) {
            if (err) reject(err);
            resolve(this);
          },
        );
      });

      res.status(200).json({
        message: "Rol actualizado exitosamente",
        user: {
          email,
          rolAnterior,
          rolNuevo: nuevoRol,
        },
      });
      logger.info("Cambio de rol exitoso", {
        actorId: req.usuario?.id,
        targetEmail: maskEmail(email),
        rolAnterior,
        rolNuevo: nuevoRol,
      });
    } catch (error) {
      logger.error("Error del sistema al cambiar rol", {
        actorId: req.usuario?.id,
        targetEmail: maskEmail(req.body?.email),
        nuevoRol: req.body?.nuevoRol,
        error: error.message,
      });
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

module.exports = router;
