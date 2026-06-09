const TestModel = require('../models/test.model');
const UserModel = require('../models/user.model');
const QuestionModel = require('../models/question.model');
const FacultyModel = require('../models/faculty.model');
const GroupModel = require('../models/group.model');
const ResultModel = require('../models/result.model');
const QuestionBankItemModel = require('../models/questionBankItem.model');
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
        const testStudentIds = this.parseIds(test.studentIds);

        const hasFacultyLimit = testFacultyIds.length > 0;
        const hasGroupLimit = testGroupIds.length > 0;
        const hasStudentLimit = testStudentIds.length > 0;

        if (!hasFacultyLimit && !hasGroupLimit && !hasStudentLimit) {
            return true;
        }

        const studentId = student?.id ? Number(student.id) : null;
        const studentFacultyId = student?.facultyId ? Number(student.facultyId) : null;
        const studentGroupId = student?.groupId ? Number(student.groupId) : null;

        const sameStudent = !hasStudentLimit || (studentId !== null && testStudentIds.includes(studentId));
        const sameFaculty = !hasFacultyLimit || (studentFacultyId !== null && testFacultyIds.includes(studentFacultyId));
        const sameGroup = !hasGroupLimit || (studentGroupId !== null && testGroupIds.includes(studentGroupId));

        return sameStudent && sameFaculty && sameGroup;
    };

    shuffle = (items) => {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    };

    normalizeQuestion = (question) => {
        const text = (question?.text || '').toString().trim();
        const options = Array.isArray(question?.options)
            ? question.options.map(option => (option || '').toString().trim()).filter(Boolean)
            : [];
        const correctAnswer = (question?.correctAnswer || '').toString().trim();

        if (!text || options.length < 2 || !correctAnswer) return null;
        const hasCorrect = options.some(option => option.toLowerCase() === correctAnswer.toLowerCase());
        if (!hasCorrect) return null;

        return { text, options, correctAnswer };
    };

    prepareRandomQuestion = (question) => {
        const source = typeof question.toJSON === 'function' ? question.toJSON() : question;
        const options = this.shuffle(source.options || []);
        const correctAnswer = options.find(option => option.toLowerCase() === source.correctAnswer.toLowerCase()) || source.correctAnswer;

        return {
            text: source.text,
            options,
            correctAnswer,
            correctAnswerIndex: options.findIndex(option => option === correctAnswer)
        };
    };

    getAll = async (req, res, next) => {
        let modelList = await TestModel.findAll({
            include: [
                { model: UserModel, as: 'teacher', attributes: ['firstname', 'lastname'] },
                { model: QuestionModel, as: 'questions' }
            ],
            order: [['createdAt', 'DESC']]
        });
        if (req.currentUser?.role === 'Student') {
            modelList = modelList.filter(test => this.canStudentAccessTest(req.currentUser, test));
        }
        res.send(modelList);
    };

    getQuestionBankStats = async (req, res, next) => {
        const where = req.currentUser?.role === 'Admin' ? {} : { teacherId: req.currentUser.id };
        const [items, testCount] = await Promise.all([
            QuestionBankItemModel.findAll({ where, attributes: ['subject'] }),
            TestModel.count({ where: req.currentUser?.role === 'Teacher' ? { teacherId: req.currentUser.id } : {} })
        ]);
        const subjectsMap = new Map();

        items.forEach(item => {
            const subject = item.subject || 'Umumiy';
            subjectsMap.set(subject, (subjectsMap.get(subject) || 0) + 1);
        });

        const subjects = Array.from(subjectsMap.entries())
            .map(([subject, count]) => ({ subject, count }))
            .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject));

        res.send({
            count: items.length,
            testCount,
            subjects
        });
    };

    importQuestionBank = async (req, res, next) => {
        if (req.currentUser?.role === 'Student') {
            throw new HttpException(403, 'Ruxsat yo`q');
        }

        const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];
        const subject = (req.body?.subject || '').toString().trim();

        if (!subject) {
            throw new HttpException(400, 'Fan nomini kiriting');
        }

        const preparedQuestions = questions
            .map(this.normalizeQuestion)
            .filter(Boolean)
            .map(question => ({ ...question, subject, teacherId: req.currentUser.id }));

        if (preparedQuestions.length === 0) {
            throw new HttpException(400, 'Bazaga saqlash uchun yaroqli savollar topilmadi');
        }

        await QuestionBankItemModel.bulkCreate(preparedQuestions);
        const where = req.currentUser?.role === 'Admin' ? {} : { teacherId: req.currentUser.id };
        const [count, subjectCount] = await Promise.all([
            QuestionBankItemModel.count({ where }),
            QuestionBankItemModel.count({ where: { ...where, subject } })
        ]);

        res.status(201).send({
            imported: preparedQuestions.length,
            count,
            subject,
            subjectCount
        });
    };

    getRandomFromQuestionBank = async (req, res, next) => {
        if (req.currentUser?.role === 'Student') {
            throw new HttpException(403, 'Ruxsat yo`q');
        }

        const requestedCount = Number(req.query.count || 0);
        if (!requestedCount || requestedCount <= 0) {
            throw new HttpException(400, 'Savollar sonini kiriting');
        }

        const subject = (req.query.subject || '').toString().trim();
        const where = req.currentUser?.role === 'Admin' ? {} : { teacherId: req.currentUser.id };
        if (subject) where.subject = subject;
        const bankItems = await QuestionBankItemModel.findAll({ where });
        if (bankItems.length < requestedCount) {
            throw new HttpException(400, `Bazadagi savollar soni yetarli emas. Hozir: ${bankItems.length} ta`);
        }

        const questions = this.shuffle(bankItems)
            .slice(0, requestedCount)
            .map(this.prepareRandomQuestion);

        res.send({ questions, total: bankItems.length, subject: subject || null });
    };

    create = async (req, res, next) => {
        const { name, description, duration, maxScore, facultyIds, groupIds, studentIds, deadline, questions } = req.body;
        const teacherId = req.currentUser.id;
        const safeMaxScore = Number(maxScore || 100);

        if (!safeMaxScore || safeMaxScore <= 0) {
            throw new HttpException(400, 'Test bali 0 dan katta bo`lishi kerak');
        }

        const result = await sequelize.transaction(async (t) => {
            const test = await TestModel.create({
                name, description, duration, maxScore: safeMaxScore, facultyIds, groupIds, studentIds: this.parseIds(studentIds), deadline, teacherId
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
        const { name, description, duration, maxScore, facultyIds, groupIds, studentIds, deadline, questions } = req.body;
        const testId = req.params.id;
        const safeMaxScore = Number(maxScore || 100);

        if (!safeMaxScore || safeMaxScore <= 0) {
            throw new HttpException(400, 'Test bali 0 dan katta bo`lishi kerak');
        }

        const result = await sequelize.transaction(async (t) => {
            const test = await TestModel.findOne({ where: { id: testId } });
            if (!test) throw new HttpException(404, 'Test not found');

            await test.update({
                name, description, duration, maxScore: safeMaxScore, facultyIds, groupIds, studentIds: this.parseIds(studentIds), deadline
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
