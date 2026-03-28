// middleware/auth.js
const { verifyToken, extractTokenFromHeader } = require('../utils/generateToken');
const logger = require('../utils/logger');


const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);

    logger.debug('Verificacion de token iniciada', {
        hasAuthorizationHeader: Boolean(authHeader),
        route: req.originalUrl,
        method: req.method,
    });

    if (!token) {
        logger.warn('Solicitud sin token de autenticacion', {
            route: req.originalUrl,
            method: req.method,
        });
        return res.status(401).json({ 
            error: 'Token no proporcionado',
            message: 'Debes incluir un token en el header Authorization: Bearer <token>'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        logger.warn('Token invalido o expirado', {
            route: req.originalUrl,
            method: req.method,
        });
        return res.status(403).json({ 
            error: 'Token inválido o expirado',
            message: 'El token ha expirado o es inválido. Inicia sesión nuevamente.'
        });
    }

    req.usuario = decoded;
    logger.debug('Token validado correctamente', {
        userId: decoded.id,
        role: decoded.role,
        route: req.originalUrl,
    });
    next();
};


const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            logger.warn('Acceso denegado por usuario no autenticado en verificacion de rol', {
                route: req.originalUrl,
                method: req.method,
            });
            return res.status(401).json({ 
                error: 'No autenticado',
                message: 'Debes iniciar sesión para acceder a este recurso'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.role)) {
            logger.warn('Acceso denegado por permisos insuficientes', {
                userId: req.usuario.id,
                rolActual: req.usuario.role,
                rolesPermitidos,
                route: req.originalUrl,
                method: req.method,
            });
            return res.status(403).json({ 
                error: 'Permisos insuficientes',
                message: `Se requiere rol: ${rolesPermitidos.join(' o ')}. Tu rol actual: ${req.usuario.role}`,
                rolesPermitidos,
                rolActual: req.usuario.role
            });
        }

        logger.info('Autorizacion por rol concedida', {
            userId: req.usuario.id,
            role: req.usuario.role,
            route: req.originalUrl,
            method: req.method,
        });

        next();
    };
};

module.exports = {
    verificarToken,
    verificarRol
};