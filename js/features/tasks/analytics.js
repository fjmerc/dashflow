/**
 * Analytics Module
 * Provides productivity insights and statistics
 */

class AnalyticsManager {
    constructor(taskDataManager) {
        this.taskDataManager = taskDataManager;
    }

    /**
     * Get completion rate for a date range
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Object} - { completed, total, rate }
     */
    getCompletionRate(startDate = null, endDate = null) {
        let tasks = this.taskDataManager.getAllTasks();

        if (startDate || endDate) {
            tasks = tasks.filter(task => {
                const taskDate = new Date(task.createdAt);
                if (startDate && taskDate < startDate) return false;
                if (endDate && taskDate > endDate) return false;
                return true;
            });
        }

        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        const rate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

        return { completed, total, rate };
    }

    /**
     * Get tasks completed per day for last N days
     * @param {number} days - Number of days to look back
     * @returns {Array} - Array of { date, count }
     */
    getCompletionTrend(days = 30) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const count = this.taskDataManager.getAllTasks().filter(task => {
                if (!task.completedAt) return false;
                const completedDate = new Date(task.completedAt);
                return completedDate.toISOString().split('T')[0] === dateStr;
            }).length;

            result.push({ date: dateStr, count });
        }

        return result;
    }

    /**
     * Get average task completion time
     * @returns {number} - Average hours between creation and completion
     */
    getAverageCompletionTime() {
        const completedTasks = this.taskDataManager.getAllTasks().filter(t => t.completed && t.completedAt);

        if (completedTasks.length === 0) return 0;

        const totalHours = completedTasks.reduce((sum, task) => {
            const created = new Date(task.createdAt);
            const completed = new Date(task.completedAt);
            const hours = (completed - created) / (1000 * 60 * 60);
            return sum + hours;
        }, 0);

        return (totalHours / completedTasks.length).toFixed(1);
    }

    /**
     * Get tasks by project with completion stats
     * @returns {Array} - Array of { project, total, completed, rate }
     */
    getProjectStats() {
        const projects = this.taskDataManager.getAllProjects();

        return projects.map(project => {
            const tasks = this.taskDataManager.getTasksByProject(project.id);
            const completed = tasks.filter(t => t.completed).length;
            const total = tasks.length;
            const rate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

            return {
                project,
                total,
                completed,
                rate
            };
        }).filter(stat => stat.total > 0);
    }

    /**
     * Get tag usage statistics
     * @returns {Array} - Array of { tag, count, completedCount, rate }
     */
    getTagStats() {
        const tagMap = new Map();

        this.taskDataManager.getAllTasks().forEach(task => {
            task.tags.forEach(tag => {
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, { total: 0, completed: 0 });
                }
                const stats = tagMap.get(tag);
                stats.total++;
                if (task.completed) stats.completed++;
            });
        });

        return Array.from(tagMap.entries())
            .map(([tag, stats]) => ({
                tag,
                count: stats.total,
                completedCount: stats.completed,
                rate: (stats.completed / stats.total * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get priority distribution
     * @returns {Object} - { high, medium, low }
     */
    getPriorityDistribution() {
        const tasks = this.taskDataManager.getAllTasks().filter(t => !t.completed);

        return {
            high: tasks.filter(t => t.priority === 'high').length,
            medium: tasks.filter(t => t.priority === 'medium').length,
            low: tasks.filter(t => t.priority === 'low').length
        };
    }

    /**
     * Get status distribution
     * @returns {Object} - { todo, inProgress, done, blocked }
     */
    getStatusDistribution() {
        const tasks = this.taskDataManager.getAllTasks();

        return {
            todo: tasks.filter(t => t.status === 'todo').length,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            done: tasks.filter(t => t.status === 'done').length,
            blocked: tasks.filter(t => t.status === 'blocked').length
        };
    }

    /**
     * Get overdue tasks count
     * @returns {number} - Count of overdue tasks
     */
    getOverdueCount() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.taskDataManager.getAllTasks().filter(task => {
            if (task.completed || !task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate < today;
        }).length;
    }

    /**
     * Get Pomodoro statistics
     * @returns {Object} - { totalPomodoros, avgPerTask, totalEstimated }
     */
    getPomodoroStats() {
        const tasks = this.taskDataManager.getAllTasks();
        const totalPomodoros = tasks.reduce((sum, t) => sum + (t.pomodorosCompleted || 0), 0);
        const tasksWithPomodoros = tasks.filter(t => t.pomodorosCompleted > 0);
        const avgPerTask = tasksWithPomodoros.length > 0
            ? (totalPomodoros / tasksWithPomodoros.length).toFixed(1)
            : 0;
        const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedPomodoros || 0), 0);

        return {
            totalPomodoros,
            avgPerTask,
            totalEstimated
        };
    }

    /**
     * Get most productive day of week
     * @returns {string} - Day name
     */
    getMostProductiveDay() {
        const dayMap = new Map([
            [0, { name: 'Sunday', count: 0 }],
            [1, { name: 'Monday', count: 0 }],
            [2, { name: 'Tuesday', count: 0 }],
            [3, { name: 'Wednesday', count: 0 }],
            [4, { name: 'Thursday', count: 0 }],
            [5, { name: 'Friday', count: 0 }],
            [6, { name: 'Saturday', count: 0 }]
        ]);

        this.taskDataManager.getAllTasks()
            .filter(t => t.completed && t.completedAt)
            .forEach(task => {
                const day = new Date(task.completedAt).getDay();
                dayMap.get(day).count++;
            });

        let maxDay = { name: 'N/A', count: 0 };
        dayMap.forEach(day => {
            if (day.count > maxDay.count) maxDay = day;
        });

        return maxDay.name;
    }

    /**
     * Get current streak (consecutive days with completed tasks)
     * @returns {number} - Streak in days
     */
    getCurrentStreak() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streak = 0;
        let currentDate = new Date(today);

        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const hasCompletions = this.taskDataManager.getAllTasks().some(task => {
                if (!task.completedAt) return false;
                return new Date(task.completedAt).toISOString().split('T')[0] === dateStr;
            });

            if (!hasCompletions) break;

            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    /**
     * Generate comprehensive analytics summary
     * @returns {Object} - All analytics data
     */
    generateSummary() {
        return {
            overall: this.getCompletionRate(),
            last30Days: this.getCompletionRate(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                new Date()
            ),
            trend: this.getCompletionTrend(30),
            avgCompletionTime: this.getAverageCompletionTime(),
            projects: this.getProjectStats(),
            tags: this.getTagStats(),
            priority: this.getPriorityDistribution(),
            status: this.getStatusDistribution(),
            overdue: this.getOverdueCount(),
            pomodoro: this.getPomodoroStats(),
            mostProductiveDay: this.getMostProductiveDay(),
            streak: this.getCurrentStreak()
        };
    }
}

// Export to global scope
window.AnalyticsManager = AnalyticsManager;

Logger.debug('analytics.js loaded');
