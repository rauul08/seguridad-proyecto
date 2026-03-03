const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");
const { generateToken } = require("./utils/generateToken");
const { verificarToken, verificarRol } = require("./middleware/auth");
const { PORT } = require("./constants/config");

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Conectar a la base de datos SQLite
const db = new sqlite3.Database(
  path.join(__dirname, "../db/usuarios.db"),
  (err) => {
    if (err) {
      console.error("Error conectando a la base de datos:", err.message);
    } else {
      console.log("Conectado a la base de datos SQLite");
    }
  },
);

// Endpoint de registro
app.post("/registro", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los datos existan
    if (!email || !password) {
      return res.status(400).json({ error: "Credenciales Invalidas" });
    }

    // Validar longitud de la contraseña
    if (password.length <= 8 || password.length >= 10) {
      return res.status(400).json({ error: "Credenciales Invalidas" });
    }

    // Verificar si el email ya existe en la BD
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

    // Éxito - Usuario registrado
    res.status(201).json({
      message: "Usuario Registrado",
      user: { email, role: "cliente" },
    });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para cambiar contraseña
app.post("/cambiar-password", verificarToken, async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;

    // Validar que el email del token coincida con el de la petición
    if (email !== req.usuario.email) {
      return res
        .status(403)
        .json({ error: "No puedes cambiar la contraseña de otro usuario" });
    }

    // Validar que los datos existan
    if (!email || !nuevaPassword) {
      return res
        .status(400)
        .json({ error: "Email y nueva contraseña son requeridos" });
    }

    // Validar longitud de la nueva contraseña
    if (nuevaPassword.length <= 8 || nuevaPassword.length >= 10) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener 9 caracteres" });
    }

    // Verificar si el email existe
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

    // Éxito
    res.status(200).json({
      message: "Contraseña actualizada exitosamente",
      user: { email },
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para cambiar rol de usuario
app.put("/cambiar-rol", verificarToken, verificarRol(["admin"]), async (req, res) => {
    try {
      const { email, nuevoRol } = req.body;

      // Validar que los datos existan
      if (!email || !nuevoRol) {
        return res
          .status(400)
          .json({ error: "Email y nuevo rol son requeridos" });
      }

      // Validar que el rol sea válido
      const rolesValidos = ["cliente", "admin", "moderador", "limpiapiso"];
      if (!rolesValidos.includes(nuevoRol)) {
        return res.status(400).json({
          error: "Rol no válido",
          rolesPermitidos: rolesValidos,
        });
      }

      // Verificar si el email existe
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
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Guardar el rol anterior
      const rolAnterior = usuarioExistente.role;

      // Actualizar el rol del usuario
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

      // Éxito
      res.status(200).json({
        message: "Rol actualizado exitosamente",
        user: {
          email,
          rolAnterior,
          rolNuevo: nuevoRol,
        },
      });
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

// Endpoint de login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los datos existan
    if (!email || !password) {
      return res.status(400).json({ error: "Credenciales Invalidas" });
    }

    // Verificar si el email existe en la BD (incluimos id y role)
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
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Comparar la contraseña ingresada con el hash almacenado
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales Invalidas" });
    }

    // Generar el token con JWT
    const token = generateToken(usuario);

    // Éxito - Usuario autenticado con token
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token: token,
      user: {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
