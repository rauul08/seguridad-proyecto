const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_ALGORITHM } = require('../constants/config');


const generateToken = (usuario) => {
    // Crear payload del token
    const payload = {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
        lat: Math.floor(Date.now() / 1000),
    };

    // Generar y retornar el token
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM });
};


const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};


const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) return null;
    
    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
    }
    
    return null;
};

module.exports = {
    generateToken,
    verifyToken,
    extractTokenFromHeader
};