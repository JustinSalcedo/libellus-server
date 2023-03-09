const { Router } = require('express')
const schedule = require('../components/schedule/route')
const task = require('../components/task/route')
const timeline = require('../components/timeline/route')

module.exports = (db) => {
    const app = Router()
    schedule(app, db)
    task(app, db)
    timeline(app, db)
    return app
}