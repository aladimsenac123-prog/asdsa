const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const path = require('path')

async function conectarBanco() {
    // Em ambientes Serverless (ex: Vercel), usa /tmp para permitir escrita no SQLite
    const dbPath = process.env.VERCEL
        ? path.join('/tmp', 'sigrh_ponto.db')
        : path.join(__dirname, '..', 'sigrh_ponto.db')

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    })

    await db.run('PRAGMA foreign_keys = ON')

    await db.exec(`
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            setor TEXT NOT NULL,
            senha_hash TEXT,
            face_descriptor TEXT NOT NULL,
            consentimento_lgpd INTEGER NOT NULL DEFAULT 1,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.exec(`
        CREATE TABLE IF NOT EXISTS Registros_Ponto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_colaborador INTEGER NOT NULL,
            tipo TEXT NOT NULL DEFAULT 'ACESSO_BIOMETRICO',
            confianca REAL,
            data TEXT NOT NULL,
            hora TEXT NOT NULL,
            FOREIGN KEY (id_colaborador) REFERENCES Users(id)
        )
    `)

    return db
}

module.exports = conectarBanco
