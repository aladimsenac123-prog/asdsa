const bcrypt = require('bcrypt')
const AppError = require('../utils/AppError')
const conectarBanco = require("../database/sqlite")

// Função utilitária para calcular a Distância Euclidiana entre dois vetores biométricos de 128 dimensões
function calcularDistanciaEuclidiana(vetorA, vetorB) {
    if (!Array.isArray(vetorA) || !Array.isArray(vetorB) || vetorA.length !== 128 || vetorB.length !== 128) {
        return Infinity
    }
    let soma = 0
    for (let i = 0; i < 128; i++) {
        const diff = Number(vetorA[i]) - Number(vetorB[i])
        soma += diff * diff
    }
    return Math.sqrt(soma)
}

class AuthController {
    // Cadastro biométrico de colaborador ("Você é a sua senha")
    static async registrar(req, res, next) {
        try {
            const { nome, email, setor, senha, faceDescriptor, consentimentoLgpd } = req.body

            if (!nome || !email || !setor) {
                return next(new AppError("Nome, e-mail corporativo e setor são obrigatórios.", 400))
            }

            if (!consentimentoLgpd) {
                return next(new AppError("É obrigatório aceitar o Termo de Consentimento e LGPD para o tratamento biométrico.", 400))
            }

            if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
                return next(new AppError("Pontos biométricos inválidos. Capture sua face utilizando a câmera antes de cadastrar.", 400))
            }

            const db = await conectarBanco()
            const emailExiste = await db.get(`SELECT id FROM Users WHERE email = ?`, [email.trim().toLowerCase()])

            if (emailExiste) {
                return next(new AppError("Este e-mail corporativo já está cadastrado no sistema!", 409))
            }

            // Verifica se a biometria facial já pertence a outro colaborador (prevenção de fraude de identidade)
            const todosUsuarios = await db.all(`SELECT id, nome, face_descriptor FROM Users`)
            for (const u of todosUsuarios) {
                try {
                    const descSalvo = JSON.parse(u.face_descriptor)
                    const distancia = calcularDistanciaEuclidiana(faceDescriptor, descSalvo)
                    if (distancia < 0.45) {
                        return next(new AppError(`Esta face já possui cadastro ativo vinculado a outro colaborador (${u.nome}).`, 409))
                    }
                } catch (_) {
                    // ignora registros legados sem vetor válido
                }
            }

            const senhaHash = senha ? await bcrypt.hash(senha, 10) : null
            const descriptorJson = JSON.stringify(faceDescriptor)

            const resultado = await db.run(
                `INSERT INTO Users (nome, email, setor, senha_hash, face_descriptor, consentimento_lgpd) VALUES (?, ?, ?, ?, ?, ?)`,
                [nome.trim(), email.trim().toLowerCase(), setor.trim(), senhaHash, descriptorJson, 1]
            )

            return res.status(201).json({
                status: 'sucesso',
                mensagem: 'Biometria facial e colaborador cadastrados com sucesso!',
                id: resultado.lastID
            })
        } catch (error) {
            next(error)
        }
    }

    // Login automático via Reconhecimento Facial (sem digitar senha)
    static async loginFacial(req, res, next) {
        try {
            const { faceDescriptor } = req.body

            if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
                return next(new AppError("Vetor biométrico ausente ou inválido.", 400))
            }

            const db = await conectarBanco()
            const usuarios = await db.all(`SELECT id, nome, email, setor, face_descriptor FROM Users`)

            if (!usuarios || usuarios.length === 0) {
                return next(new AppError("Nenhum colaborador com biometria cadastrada no banco de dados.", 404))
            }

            const LIMIAR_RECONHECIMENTO = 0.55 // Distância euclidiana máxima aceita pelo face-api.js
            let melhorCandidato = null
            let menorDistancia = Infinity

            for (const user of usuarios) {
                try {
                    const descSalvo = JSON.parse(user.face_descriptor)
                    const distancia = calcularDistanciaEuclidiana(faceDescriptor, descSalvo)
                    if (distancia < menorDistancia) {
                        menorDistancia = distancia
                        melhorCandidato = user
                    }
                } catch (_) {
                    continue
                }
            }

            if (!melhorCandidato || menorDistancia > LIMIAR_RECONHECIMENTO) {
                return next(new AppError("Face não reconhecida no sistema do laboratório. Acesso bloqueado.", 401))
            }

            // Converte distância euclidiana em percentual de similaridade/confiança
            const confianca = Math.max(0, Math.min(100, Number(((1 - menorDistancia / 1.0) * 100).toFixed(1))))

            // Cria sessão autenticada
            req.session.id_User = melhorCandidato.id
            req.session.user_Nome = melhorCandidato.nome
            req.session.user_Email = melhorCandidato.email
            req.session.user_Setor = melhorCandidato.setor
            req.session.confianca = confianca

            // Registra automaticamente o acesso biométrico/ponto
            const agora = new Date()
            const dataFormatada = agora.toLocaleDateString('pt-BR')
            const horaFormatada = agora.toLocaleTimeString('pt-BR')

            await db.run(
                `INSERT INTO Registros_Ponto (id_colaborador, tipo, confianca, data, hora) VALUES (?, ?, ?, ?, ?)`,
                [melhorCandidato.id, 'LOGIN_FACIAL_AUTOMATICO', confianca, dataFormatada, horaFormatada]
            )

            return res.status(200).json({
                status: 'sucesso',
                mensagem: `Identidade biométrica confirmada! Bem-vindo(a), ${melhorCandidato.nome}.`,
                usuario: {
                    id: melhorCandidato.id,
                    nome: melhorCandidato.nome,
                    email: melhorCandidato.email,
                    setor: melhorCandidato.setor,
                    confianca,
                    distancia: Number(menorDistancia.toFixed(4))
                }
            })
        } catch (error) {
            next(error)
        }
    }

    // Perfil do usuário autenticado para o Painel Secreto
    static async perfil(req, res, next) {
        try {
            const db = await conectarBanco()
            const usuario = await db.get(
                `SELECT id, nome, email, setor, consentimento_lgpd, criado_em FROM Users WHERE id = ?`,
                [req.session.id_User]
            )

            if (!usuario) {
                return next(new AppError("Colaborador não encontrado.", 404))
            }

            return res.status(200).json({
                status: 'sucesso',
                mensagem: "Acesso autorizado ao Painel Secreto HealthTech.",
                usuario: {
                    ...usuario,
                    confiancaSessao: req.session.confianca || 98.5
                }
            })
        } catch (error) {
            next(error)
        }
    }

    // Encerramento de sessão
    static async logout(req, res, next) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    return next(new AppError("Erro ao encerrar a sessão!", 500))
                }
                res.clearCookie('connect.sid')
                return res.status(200).json({
                    status: 'sucesso',
                    mensagem: "Logout realizado com sucesso. Sessão biométrica encerrada!"
                })
            })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = AuthController
