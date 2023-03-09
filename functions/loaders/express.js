const cors = require('cors')
const { json } = require('express');
const routes = require('../api')
const config = require('../config')

module.exports = ({ app }) => {
    app.get('/status', (req, res) => {
        res.status(200).end()
    })

    app.head('/status', (req, res) => {
        res.status(200).end()
    })

    app.enable('trust proxy')

    app.use(cors())

    app.use(require('method-override')())

    app.use(json())

    app.use(config.api.prefix, routes())

    // Authorization

    app.use((req, res, next) => {
        const { userid: userId } = req.headers
        if (userId !== config.userId) return res.status(403).send({ message: 'Forbidden' }).end()
        next()
    })

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
}