const express = require('express')
const router = express.Router()
const AuthController = require('../controller/AuthController')
const PontoController = require('../controller/PontoController')
const verificarAutenticacao = require('../middlewares/authMiddleware')

// Rotas públicas de biometria
router.post('/registrar', AuthController.registrar)
router.post('/login-facial', AuthController.loginFacial)
router.post('/logout', AuthController.logout)

// Rotas protegidas (Painel Secreto do Laboratório HealthTech)
router.get('/perfil', verificarAutenticacao, AuthController.perfil)
router.post('/ponto', verificarAutenticacao, PontoController.baterPonto)
router.get('/ponto', verificarAutenticacao, PontoController.listarRegistros)

module.exports = router
