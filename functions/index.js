const functions = require("firebase-functions");
const config = require('./config')

// Firestore

const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

// Setup

const express = require('express')
const app = express()

app.get('/status', (req, res) => {
    res.status(200).end()
})

app.head('/status', (req, res) => {
    res.status(200).end()
})

app.enable('trust proxy')

const cors = require('cors')
const { json } = require('express');
const api = require("./api");
app.use(cors())

app.use(require('method-override')())

app.use(json())

// Authorization

app.use((req, res, next) => {
    const { userid: userId } = req.headers
    if (userId !== config.userId) return res.status(403).send({ message: 'Forbidden' }).end()
    next()
})

// API

app.use(api(db))

// Error handling

app.use((req, res, next) => {
    const err = new Error('Not Found')
    err['status'] = 404
    next(err)
})

app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res
            .status(err.status)
            .send({ message: err.message })
            .end()
    }
    return next(err)
})

app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.json({
        errors: {
            message: err.message
        }
    })
})

// Serve

exports.api = functions.https.onRequest(app)