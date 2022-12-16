const functions = require("firebase-functions");

const dotenv = require('dotenv')
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const envFound = dotenv.config()
if (envFound.error) {
    throw new Error("Couldn't file .env file")
}

const { USER_ID, DB_USER, DB_PASSWD } = process.env


// SQL Models

const { Sequelize, Model, DataTypes, Op } = require('sequelize')
const sequelize = new Sequelize('database', DB_USER, DB_PASSWD, {
    host: "0.0.0.0",
    dialect: "sqlite",
    pool: { max: 5, min: 0, idle: 10000 },
    storage: "./db/database.sqlite"
})

const Task = sequelize.define('Task', {
    name: DataTypes.STRING,
    start: DataTypes.DATE,
    end: DataTypes.DATE
})

sequelize.authenticate()
    .then(() => { console.log('Connection established'); setupModels() })
    .catch(error => console.error('Unable to connect to database: %o', error))

function setupModels() {
    Task.sync()   // .sync({ force: true }) to restart table
}

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
const { json } = require('express')
app.use(cors())

app.use(require('method-override')())

app.use(json())

// Authorization

app.use((req, res, next) => {
    const { userid: userId } = req.headers
    if (userId !== USER_ID) return res.status(403).send({ message: 'Forbidden' }).end()
    next()
})

// API

const timelineRouter = express.Router()
app.use('/timeline', timelineRouter)

timelineRouter.get(
    '',
    async (req, res, next) => {
        console.log('Calling /timeline')

        try {
            const timeline = await getTimeline()
            if (!timeline) return next(new Error('Undefined response'))
            return res.status(200).json({ timeline })
        } catch (error) {
            console.error('Error: %o', error)
            return next(error)
        }
    }
)

const scheduleRouter = express.Router()
app.use('/schedule', scheduleRouter)

scheduleRouter.get(
    '',
    async (req, res, next) => {
        console.log('Calling /schedule')

        try {
            const schedule = await getTodaysSchedule()
            if (!schedule) return next(new Error('Undefined response'))
            return res.status(200).json({ schedule })
        } catch (error) {
            console.error('Error: %o', error)
            return next(error)
        }
    }
)

scheduleRouter.post(
    '',
    async (req, res, next) => {
        console.log('Calling /schedule')

        try {
            const { schedule } = req.body
            const records = await createSchedule(schedule)
            if (!records) return next(new Error('Undefined response'))
            return res.status(201).json({ schedule: records })
        } catch (error) {
            console.error('Error: %o', error)
            return next(error)
        }
    }
)


const taskRouter = express.Router()
app.use('/task', taskRouter)

taskRouter.put(
    '/:id',
    async (req, res, next) => {
        console.log('Calling /task')

        try {
            const { id } = req.params
            const { name, start, end } = req.body
            const wasUpdated = await editTask(id, { name, start, end })
            if (!wasUpdated) return next(new Error('Update failed'))
            return res.status(200).end()
        } catch (error) {
            console.error('Error: %o', error)
            return next(error)
        }
    }
)

taskRouter.delete(
    '',
    async (req, res, next) => {
        console.log('Calling /task')

        try {
            const { ids } = req.body
            const deletedCount = await deleteManyTasks(ids)
            if (!deletedCount) return next(new Error('No items were deleted'))
            return res.status(200).json({ deletedCount })
        } catch (error) {
            console.error('Error: %o', error)
            return next(error)
        }
    }
)

taskRouter.delete(
    '/:id',
    async (req, res, next) => {
        console.log('Calling /task')

        try {
            const { id } = req.params
            const wasDeleted = await deleteTask(id)
            if (!wasDeleted) return next(new Error('Deletion failed'))
            return res.status(200).end()
        } catch (error) {
            console.error('Error: %o', error)
            return next(error)
        }
    }
)

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

// app.listen(3000, () => {
//     console.log('Server listening on port 3000')
// })


// Services

async function getTimeline(dateRange) {
    try {
        if (dateRange) {
            const { startDate, endDate } = dateRange
            const records = await Task.findAll({
                where: { start: { [Op.between]: [startDate, endDate] } }
            })
            return records
        }
        const records = await Task.findAll()
        return records
    } catch (error) {
        throw new Error(`Error getting timeline: ${error}`)
    }
}

async function getTodaysSchedule() {
    const now = new Date()
    const today = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`
    const startDate = new Date(today)
    const endDate = new Date(`${today} 23:59:59`)
    return getTimeline({ startDate, endDate })
}

async function createSchedule(schedule) {
    try {
        if (!schedule || !schedule.length) return null
        const records = await Task.bulkCreate(schedule)
        return records
    } catch (error) {
        throw new Error(`Error creating schedule: ${error}`)
    }
}

async function editTask(id, task) {
    try {
        const [updatedCount] = await Task.update(task, { where: { id } })
        return !!updatedCount   // was updated (or found)?
    } catch (error) {
        throw new Error(`Error editing task ${id}: ${error}`)
    }
}

async function deleteTask(id) {
    try {
        const deletedCount = await Task.destroy({ where: { id } })
        return !!deletedCount   // was deleted?
    } catch (error) {
        throw new Error(`Error deleting task ${id}: ${error}`)
    }
}

async function deleteManyTasks(ids) {
    try {
        const deletedCount = await Task.destroy({ where: { id: ids } })
        return deletedCount
    } catch (error) {
        throw new Error(`Error deleting tasks ${ids.join(', ')}: ${error}`)
    }
}

exports.api = functions.https.onRequest(app)