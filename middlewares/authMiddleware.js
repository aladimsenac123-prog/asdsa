const AppError = require('../utils/AppError');

function verificarAutenticacao(req, res, next) {
    if (req.session && req.session.id_User) {
        return next();
    }
    return next(new AppError("Acesso negado. Faça o reconhecimento facial para acessar o Painel Secreto.", 401));
}

module.exports = verificarAutenticacao;
