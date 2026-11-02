const jwt = require('jsonwebtoken');

// Em produção, a chave deve vir de variável de ambiente.
// O fallback existe apenas para facilitar a execução local e o CI.
const SECRET = process.env.JWT_SECRET || 'Chave_TechChallenge';
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '8h';

function signToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, name: user.name, role: user.role },
        SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

/**
 * authorize()            -> exige apenas um token válido (professor ou aluno)
 * authorize('professor') -> exige token de professor
 */
function authorize(requiredRole) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ message: 'Token de autenticação não fornecido' });
        }

        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'Token de autenticação mal formatado' });
        }

        jwt.verify(token, SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Sessão inválida ou expirada. Entre novamente.' });
            }

            if (requiredRole && decoded.role !== requiredRole) {
                return res.status(403).json({ message: 'Você não tem permissão para esta ação' });
            }

            req.user = decoded;
            next();
        });
    };
}

module.exports = { authorize, signToken, SECRET };
