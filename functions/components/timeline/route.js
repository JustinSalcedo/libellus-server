const express = require('express')
const Service = require('./service')

const router = express.Router()

module.exports = (app, db) => {
    app.use('/timeline', router)
    
    router.get(
        '',
        async (req, res, next) => {
            console.log('Calling /timeline')
    
            try {
                const serviceInstance = new Service(db)
                const { start, end } = req.params
                const timeline = (start && end)
                    ? await serviceInstance.getTimeline({ startDate: start, endDate: end })
                    : await serviceInstance.getTimeline()
                if (!timeline) return next(new Error('Undefined response'))
                return res.status(200).json({ timeline })
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )
}