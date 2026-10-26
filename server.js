const express = require('express')
const cors = require('cors')
const path = require('path')
const conectarBanco = require('./database/sqlite')
const session = require('express-session')
const AppError = require('./utils/AppError')
const authRoutes = require('./routes/authRoutes')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '5mb' }))

app.use(cors({
    origin: true,
    credentials: true
}))

// Configurando o express-session
app.use(session({
    secret: process.env.SESSION_SECRET || "healthtech-biometria-chave-secreta-lgpd-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 30 // 30 minutos
    }
}))

// Iniciar e sincronizar o banco SQLite
conectarBanco()
    .then(() => console.log("🎲 Banco de Dados HealthTech (SIGRH-BioAuth) conectado e sincronizado!"))
    .catch((err) => console.error("Erro ao conectar banco:", err))

// Servindo arquivos estáticos da interface web (Frontend + face-api.js)
app.use(express.static(path.join(__dirname, 'public')))

// Rotas da API
app.use('/api', authRoutes)

// Middleware global de tratamento de erros
app.use((erro, req, res, next) => {
    if (erro instanceof AppError) {
        return res.status(erro.statusCode).json({
            status: 'erro',
            mensagem: erro.message
        })
    }
    console.error("💣 Erro interno não tratado 💥", erro)

    return res.status(500).json({
        status: "erro",
        mensagem: "Falha interna no servidor!"
    })
})

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor HealthTech BioAuth rodando na porta ${PORT}`)
        console.log(`🌐 Acesse a aplicação em: http://localhost:${PORT}`)
    })
}

module.exports = app
