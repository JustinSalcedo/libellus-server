const { deleteQueryBatch } = require("../../utils")

const parseDoc = doc => ({ id: doc.id, ...doc.data() })

class TaskStore {
    table = 'tasks'

    constructor(db) {
        this.db = db
    }

    async getMany({ dateRange, ids }) {
        if (dateRange) {
            const { startDate, endDate } = dateRange
            const snapshot = await this.db.collection(this.table)
                .where('start', '>=', startDate)
                .where('start', '<=', endDate)
                .get()
            return snapshot.docs.map(parseDoc)
        }

        // Only return up to 10 items
        if (ids.length > 10) throw new Error('Cannot return more than 10 items per ID')
        const snapshot = await this.db.collection(this.table)
            .where('__name__', 'in', ids).get()
        return snapshot.docs.map(parseDoc)
    }

    async getAll() {
        const snapshot = await this.db.collection(this.table).get()
        return snapshot.docs.map(parseDoc)
    }

    async create(task) {
        const docRef = await this.db.collection(this.table).add(task)

        return { id: docRef.id, ...task }   // docRef has no data
    }

    async createMany(tasks) {
        const batch = this.db.batch()
        const docs = tasks.map(task => {
            const docRef = this.db.collection(this.table).doc()
            batch.create(docRef, task)
            return { id: docRef.id, ...task }
        })
        await batch.commit()
        return docs
    }

    async update(id, task) {
        await this.db.collection(this.table).doc(id).update(task)
        return true
    }

    async delete(id) {
        await this.db.collection(this.table).doc(id).delete()
        return true
    }

    async deleteMany(ids) {
        // delete only up to 10 documents
        if (ids.length > 10) throw new Error('Cannot delete more than 10 items')

        const query = this.db.collection(this.table).where('__name__', 'in', ids)

        return new Promise((resolve, reject) => {
            deleteQueryBatch(this.db, query, resolve).catch(reject)
        })
    }

    // Based on Cloud Firestore docs
    async deleteAll() {
        const collectionRef = this.db.collection(this.table)
        const query = collectionRef.orderBy('__name__').limit(50)   // batch size

        return new Promise((resolve, reject) => {
            deleteQueryBatch(this.db, query, resolve).catch(reject)
        })
    }
}

module.exports = TaskStore