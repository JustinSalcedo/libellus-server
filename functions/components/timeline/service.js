const { isDate } = require('../../utils')
const TaskStore = require('../task/store')

class TimelineService {
    constructor(db) {
        this.taskStore = new TaskStore(db)
    }
    
    async getTimeline(dateRange) {
        try {
            if (dateRange) {
                const { startDate, endDate } = dateRange
                return this.taskStore.getMany({ dateRange: {
                    startDate: isDate(startDate) ? startDate.toJSON() : startDate,
                    endDate: isDate(endDate) ? endDate.toJSON() : endDate
                } })
            }
            return this.taskStore.getAll()
        } catch (error) {
            throw new Error(`Error getting timeline: ${error}`)
        }
    }
}

module.exports = TimelineService