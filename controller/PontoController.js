const AppError = require('../utils/AppError')
const conectarBanco = require("../database/sqlite")

class PontoController {
    static async baterPonto(req, res, next) {
        try {
            const idColaborador = req.session.id_User
            const { tipo } = req.body

            if (!idColaborador) {
                return next(new AppError("Sessão biométrica inválida.", 401))
            }

            const agora = new Date()
            const data = agora.toLocaleDateString('pt-BR')
            const hora = agora.toLocaleTimeString('pt-BR')
            const tipoRegistro = tipo || 'BATIDA_PONTO_BIOMETRICO'
            const confianca = req.session.confianca || 99.0

            const db = await conectarBanco()
            const resultado = await db.run(
                `INSERT INTO Registros_Ponto (id_colaborador, tipo, confianca, data, hora) VALUES (?, ?, ?, ?, ?)`,
                [idColaborador, tipoRegistro, confianca, data, hora]
            )

            return res.status(201).json({
                status: 'sucesso',
                mensagem: `Registro (${tipoRegistro}) efetuado às ${hora}!`,
                registro: {
                    id: resultado.lastID,
                    tipo: tipoRegistro,
                    confianca,
                    data,
                    hora
                }
            })
        } catch (error) {
            next(error)
        }
    }

    static async listarRegistros(req, res, next) {
        try {
            const db = await conectarBanco()
            const registros = await db.all(`
                SELECT 
                    r.id,
                    r.tipo,
                    r.confianca,
                    r.data,
                    r.hora,
                    u.nome,
                    u.email,
                    u.setor
                FROM Registros_Ponto r
                INNER JOIN Users u ON u.id = r.id_colaborador
                ORDER BY r.id DESC
                LIMIT 30
            `)

            const totalColaboradores = await db.get(`SELECT COUNT(*) as total FROM Users`)

            return res.status(200).json({
                status: 'sucesso',
                totalColaboradores: totalColaboradores ? totalColaboradores.total : 0,
                registros
            })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = PontoController
