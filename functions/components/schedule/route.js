const express = require('express')
const Service = require('./service')

const router = express.Router()

module.exports = (app, db) => {
    app.use('/schedule', router)
    
    router.get(
        '',
        async (req, res, next) => {
            console.log('Calling /schedule')
    
            try {
                const serviceInstance = new Service(db)
                const schedule = await serviceInstance.getTodaysSchedule()
                if (!schedule) return next(new Error('Undefined response'))
                return res.status(200).json({ schedule })
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )

    router.post(
        '',
        async (req, res, next) => {
            console.log('Calling /schedule')
    
            try {
                const serviceInstance = new Service(db)
                const { schedule } = req.body
                const records = await serviceInstance.createSchedule(schedule)
                if (!records) return next(new Error('Undefined response'))
                return res.status(201).json({ schedule: records })
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )
}