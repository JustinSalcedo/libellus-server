const functions = require("firebase-functions");

const dotenv = require('dotenv')
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const envFound = dotenv.config()
if (envFound.error) {
    throw new Error("Couldn't file .env file")
}

const { USER_ID } = process.env


// Firestore

const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

// From Cloud Firestore docs
async function deleteQueryBatch(db, query, resolve, count) {
    let localCount = count ? count : 0
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve({ deletedCount: localCount });
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        ++localCount
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, localCount);
    });
}

const parseDoc = doc => ({ id: doc.id, ...doc.data() })

class TaskModel {
    table = 'tasks'

    async getMany({ dateRange, ids }) {
        if (dateRange) {
            const { startDate, endDate } = dateRange
            const snapshot = await db.collection(this.table)
                .where('start', '>=', startDate)
                .where('start', '<=', endDate)
                .get()
            return snapshot.docs.map(parseDoc)
        }

        // Only return up to 10 items
        if (ids.length > 10) throw new Error('Cannot return more than 10 items per ID')
        const snapshot = await db.collection(this.table)
            .where('__name__', 'in', ids).get()
        return snapshot.docs.map(parseDoc)
    }

    async getAll() {
        const snapshot = await db.collection(this.table).get()
        return snapshot.docs.map(parseDoc)
    }

    async create(task) {
        const docRef = await db.collection(this.table).add(task)

        return { id: docRef.id, ...task }   // docRef has no data
    }

    async createMany(tasks) {
        const batch = db.batch()
        const docs = tasks.map(task => {
            const docRef = db.collection(this.table).doc()
            batch.create(docRef, task)
            return { id: docRef.id, ...task }
        })
        await batch.commit()
        return docs
    }

    async update(id, task) {
        const taskData = { ...task }; delete taskData.id
        await db.collection(this.table).doc(id).update(task)
        return true
    }

    async delete(id) {
        await db.collection(this.table).doc(id).delete()
        return true
    }

    async deleteMany(ids) {
        // delete only up to 10 documents
        if (ids.length > 10) throw new Error('Cannot delete more than 10 items')

        const query = db.collection(this.table).where('__name__', 'in', ids)

        return new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, resolve).catch(reject)
        })
    }

    // Based on Cloud Firestore docs
    async deleteAll() {
        const collectionRef = db.collection(this.table)
        const query = collectionRef.orderBy('__name__').limit(50)   // batch size

        return new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, resolve).catch(reject)
        })
    }
}

const Task = new TaskModel()

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
    '/all',
    async (req, res, next) => {
        console.log('Calling /task')

        try {
            const deletedCount = await deleteAllTasks()
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
            return Task.getMany({ dateRange: {
                startDate: isDate(startDate) ? startDate.toJSON() : startDate,
                endDate: isDate(endDate) ? endDate.toJSON() : endDate
            } })
        }
        return Task.getAll()
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
        const parsedSchedule = schedule.map(parseTaskDates)
        const records = await Task.createMany(parsedSchedule)
        return records
    } catch (error) {
        throw new Error(`Error creating schedule: ${error}`)
    }
}

async function editTask(id, task) {
    try {
        const parsedTask = parseTaskDates(task)
        return Task.update(id, parsedTask)
    } catch (error) {
        throw new Error(`Error editing task ${id}: ${error}`)
    }
}

async function deleteTask(id) {
    try {
        return Task.delete(id)
    } catch (error) {
        throw new Error(`Error deleting task ${id}: ${error}`)
    }
}

async function deleteManyTasks(ids) {
    try {
        const { deletedCount } = await Task.deleteMany(ids)
        return deletedCount
    } catch (error) {
        throw new Error(`Error deleting tasks ${ids.join(', ')}: ${error}`)
    }
}

async function deleteAllTasks() {
    try {
        const { deletedCount } = await Task.deleteAll()
        return deletedCount
    } catch (error) {
        throw new Error(`Error deleting all tasks: ${error}`)
    }
}

function parseTaskDates(task) {
    return {
        ...task,
        start: isDate(task.start) ? task.start.toJSON() : task.start,
        end: isDate(task.end) ? task.end.toJSON() : task.end
    }
}

function isDate(timestamp) {
    return timestamp instanceof Date
}

exports.api = functions.https.onRequest(app)