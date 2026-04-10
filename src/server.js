const express = require("express");
const { PORT } = require("./constants/config");
const logger = require("./utils/logger");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");

const app = express();

app.disable("x-powered-by");

// Middleware para parsear JSON
app.use(express.json());

// Registrar rutas
app.use("/", authRoutes);
app.use("/product", productRoutes);
app.use("/cart", cartRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  logger.info(`Servidor corriendo en http://localhost:${PORT}`);
});
