const TestModel = require('../models/test.model');
const UserModel = require('../models/user.model');
const QuestionModel = require('../models/question.model');
const FacultyModel = require('../models/faculty.model');
const GroupModel = require('../models/group.model');
const ResultModel = require('../models/result.model');
const BaseController = require('./BaseController');
const HttpException = require('../utils/HttpException.utils');
const sequelize = require('../db/db-sequelize');

class TestController extends BaseController {
    parseIds = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(Number).filter(id => !Number.isNaN(id) && id > 0);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.map(Number).filter(id => !Number.isNaN(id) && id > 0);
                }
            } catch (e) {
                const num = Number(value);
                return Number.isNaN(num) || num <= 0 ? [] : [num];
            }
        }
        const num = Number(value);
        return Number.isNaN(num) || num <= 0 ? [] : [num];
    };

    canStudentAccessTest = (student, test) => {
        const testFacultyIds = this.parseIds(test.facultyIds);
        const testGroupIds = this.parseIds(test.groupIds);

        const hasFacultyLimit = testFacultyIds.length > 0;
        const hasGroupLimit = testGroupIds.length > 0;

        if (!hasFacultyLimit && !hasGroupLimit) {
            return true;
        }

        const studentFacultyId = student?.facultyId ? Number(student.facultyId) : null;
        const studentGroupId = student?.groupId ? Number(student.groupId) : null;

        const sameFaculty = !hasFacultyLimit || (studentFacultyId !== null && testFacultyIds.includes(studentFacultyId));
        const sameGroup = !hasGroupLimit || (studentGroupId !== null && testGroupIds.includes(studentGroupId));

        return sameFaculty && sameGroup;
    };

    getAll = async (req, res, next) => {
        let modelList = await TestModel.findAll({
            include: [
                { model: UserModel, as: 'teacher', attributes: ['firstname', 'lastname'] },
                { model: QuestionModel, as: 'questions' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.send(modelList);
    };

    create = async (req, res, next) => {
        const { name, description, duration, maxScore, facultyIds, groupIds, deadline, questions } = req.body;
        const teacherId = req.currentUser.id;
        const safeMaxScore = Number(maxScore || 100);

        if (!safeMaxScore || safeMaxScore <= 0) {
            throw new HttpException(400, 'Test bali 0 dan katta bo`lishi kerak');
        }

        const result = await sequelize.transaction(async (t) => {
            const test = await TestModel.create({
                name, description, duration, maxScore: safeMaxScore, facultyIds, groupIds, deadline, teacherId
            }, { transaction: t });

            if (questions && questions.length > 0) {
                const questionsWithId = questions.map(q => ({
                    ...q,
                    testId: test.id
                }));
                await QuestionModel.bulkCreate(questionsWithId, { transaction: t });
            }

            return test;
        });

        res.status(201).send(result);
    };

    update = async (req, res, next) => {
        const { name, description, duration, maxScore, facultyIds, groupIds, deadline, questions } = req.body;
        const testId = req.params.id;
        const safeMaxScore = Number(maxScore || 100);

        if (!safeMaxScore || safeMaxScore <= 0) {
            throw new HttpException(400, 'Test bali 0 dan katta bo`lishi kerak');
        }

        const result = await sequelize.transaction(async (t) => {
            const test = await TestModel.findOne({ where: { id: testId } });
            if (!test) throw new HttpException(404, 'Test not found');

            await test.update({
                name, description, duration, maxScore: safeMaxScore, facultyIds, groupIds, deadline
            }, { transaction: t });

            if (questions) {
                await QuestionModel.destroy({ where: { testId }, transaction: t });
                if (questions.length > 0) {
                    const questionsWithId = questions.map(q => ({
                        ...q,
                        testId
                    }));
                    await QuestionModel.bulkCreate(questionsWithId, { transaction: t });
                }
            }

            return test;
        });

        res.send(result);
    };

    delete = async (req, res, next) => {
        const model = await TestModel.findOne({ where: { id: req.params.id } });
        if (!model) {
            throw new HttpException(404, 'Test not found');
        }
        await model.destroy();
        res.send('Test deleted');
    };

    getStats = async (req, res, next) => {
        const userCount = await UserModel.count();
        const studentCount = await UserModel.count({ where: { role: 'Student' } });
        const teacherCount = await UserModel.count({ where: { role: 'Teacher' } });

        const currentUser = req.currentUser;
        const role = currentUser?.role;

        let testWhere = {};
        if (role === 'Teacher') {
            testWhere.teacherId = currentUser.id;
        }

        const tests = await TestModel.findAll({
            where: testWhere,
            order: [['createdAt', 'DESC']],
            include: [{ model: UserModel, as: 'teacher', attributes: ['firstname', 'lastname'] }]
        });

        const visibleTests = role === 'Student'
            ? tests.filter(test => this.canStudentAccessTest(currentUser, test))
            : tests;

        const testIds = visibleTests.map(test => test.id);
        const testCount = visibleTests.length;

        let resultsWhere = {};
        if (role === 'Student') {
            resultsWhere.studentId = currentUser.id;
        } else if (testIds.length) {
            resultsWhere.testId = testIds;
        } else {
            resultsWhere.testId = null;
        }

        const results = await ResultModel.findAll({
            where: resultsWhere
        });

        const resultCount = results.length;
        const averageScore = resultCount
            ? Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / resultCount)
            : 0;

        let pendingTaskCount = 0;
        let completedTaskCount = 0;

        let pendingTests = [];

        if (role === 'Student') {
            const solvedTestIds = new Set(results.map(result => result.testId));
            completedTaskCount = solvedTestIds.size;
            pendingTests = visibleTests.filter(test => !solvedTestIds.has(test.id));
            pendingTaskCount = pendingTests.length;
        } else {
            completedTaskCount = resultCount;
            pendingTaskCount = visibleTests.filter(test => !test.deadline || new Date(test.deadline) >= new Date()).length;
        }

        const recentTests = visibleTests.slice(0, 5);

        res.send({
            testCount,
            userCount,
            studentCount,
            teacherCount,
            resultCount,
            averageScore,
            pendingTaskCount,
            completedTaskCount,
            recentTests,
            pendingTests
        });
    };
}

module.exports = new TestController;
