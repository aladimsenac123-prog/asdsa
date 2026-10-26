const express = require('express')
const router = express.Router()
const VeiculoController = require('../controller/VeiculoController')

// Rotas gerais e específicas
router.post('/veiculos', VeiculoController.cadastrar)
router.get('/veiculos', VeiculoController.listar)
router.put('/veiculos/:placa', VeiculoController.atualizar)
router.delete('/veiculos/:placa', VeiculoController.remover)

module.exports = router

    // "jsonwebtoken": "^9.0.3"