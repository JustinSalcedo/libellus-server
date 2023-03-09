const express = require('express')
const Service = require('./service')

const route = express.Router()
module.exports = (app, db) => {
    app.use('/task', route)
    
    route.put(
        '/:id',
        async (req, res, next) => {
            console.log('Calling /task')
    
            try {
                const { id } = req.params
                const { name, start, end } = req.body
                const serviceInstance = new Service(db)
                const wasUpdated = await serviceInstance.editTask(id, { name, start, end })
                if (!wasUpdated) return next(new Error('Update failed'))
                return res.status(200).end()
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )
    
    route.delete(
        '',
        async (req, res, next) => {
            console.log('Calling /task')
    
            try {
                const { ids } = req.body
                const serviceInstance = new Service(db)
                const deletedCount = await serviceInstance.deleteManyTasks(ids)
                if (!deletedCount) return next(new Error('No items were deleted'))
                return res.status(200).json({ deletedCount })
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )
    
    route.delete(
        '/all',
        async (req, res, next) => {
            console.log('Calling /task')
    
            try {
                const serviceInstance = new Service(db)
                const deletedCount = await serviceInstance.deleteAllTasks()
                if (!deletedCount) return next(new Error('No items were deleted'))
                return res.status(200).json({ deletedCount })
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )
    
    route.delete(
        '/:id',
        async (req, res, next) => {
            console.log('Calling /task')
    
            try {
                const { id } = req.params
                const serviceInstance = new Service(db)
                const wasDeleted = await serviceInstance.deleteTask(id)
                if (!wasDeleted) return next(new Error('Deletion failed'))
                return res.status(200).end()
            } catch (error) {
                console.error('Error: %o', error)
                return next(error)
            }
        }
    )
}