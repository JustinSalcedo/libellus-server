const { parseTaskDates } = require('../../utils')
const TaskStore = require('../task/store')
const TimelineService = require('../timeline/service')

class ScheduleService {
    constructor(db) {
        this.taskStore = new TaskStore(db)
        this.timelineService = new TimelineService(db)
    }

    async getTodaysSchedule() {
        // TODO: request user timezone or get from DB
        // Hardcoded for Pacific Standard Time
        const offsetInMs = -8 * 60 * 60 * 1000
        const now = new Date(Date.now() + offsetInMs)
        const today = new Date(now.toLocaleDateString())
        const startDate = new Date(today.getTime() - offsetInMs)
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
        return this.timelineService.getTimeline({ startDate, endDate })
    }
    
    async createSchedule(schedule) {
        try {
            if (!schedule || !schedule.length) return null
            const parsedSchedule = schedule.map(parseTaskDates)
            const records = await this.taskStore.createMany(parsedSchedule)
            return records
        } catch (error) {
            throw new Error(`Error creating schedule: ${error}`)
        }
    }
}

module.exports = ScheduleService