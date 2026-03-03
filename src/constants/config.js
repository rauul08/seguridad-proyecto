require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM;

const PORT = process.env.PORT || 3000;

module.exports = {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    JWT_ALGORITHM,
    PORT
};
