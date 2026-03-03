// middleware/auth.js
const { verifyToken, extractTokenFromHeader } = require('../utils/generateToken');


const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
        return res.status(401).json({ 
            error: 'Token no proporcionado',
            message: 'Debes incluir un token en el header Authorization: Bearer <token>'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ 
            error: 'Token inválido o expirado',
            message: 'El token ha expirado o es inválido. Inicia sesión nuevamente.'
        });
    }

    req.usuario = decoded;
    next();
};

/**
 * Middleware para verificar roles específicos
 * @param {Array} rolesPermitidos - Lista de roles permitidos
 */
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ 
                error: 'No autenticado',
                message: 'Debes iniciar sesión para acceder a este recurso'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.role)) {
            return res.status(403).json({ 
                error: 'Permisos insuficientes',
                message: `Se requiere rol: ${rolesPermitidos.join(' o ')}. Tu rol actual: ${req.usuario.role}`,
                rolesPermitidos,
                rolActual: req.usuario.role
            });
        }

        next();
    };
};

module.exports = {
    verificarToken,
    verificarRol
};