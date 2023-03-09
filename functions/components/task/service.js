const { parseTaskDates } = require("../../utils")
const TaskStore = require("./store")

class TaskService {
    constructor(db) {
        this.taskStore = new TaskStore(db)
    }

    async editTask(id, task) {
        try {
            const parsedTask = parseTaskDates(task)
            return this.taskStore.update(id, parsedTask)
        } catch (error) {
            throw new Error(`Error editing task ${id}: ${error}`)
        }
    }

    async deleteTask(id) {
        try {
            return this.taskStore.delete(id)
        } catch (error) {
            throw new Error(`Error deleting task ${id}: ${error}`)
        }
    }

    async deleteManyTasks(ids) {
        try {
            const { deletedCount } = await this.taskStore.deleteMany(ids)
            return deletedCount
        } catch (error) {
            throw new Error(`Error deleting tasks ${ids.join(', ')}: ${error}`)
        }
    }

    async deleteAllTasks() {
        try {
            const { deletedCount } = await this.taskStore.deleteAll()
            return deletedCount
        } catch (error) {
            throw new Error(`Error deleting all tasks: ${error}`)
        }
    }
}

module.exports = TaskService