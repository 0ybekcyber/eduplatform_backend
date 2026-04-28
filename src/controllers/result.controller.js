const ResultModel = require('../models/result.model');
const TestModel = require('../models/test.model');
const UserModel = require('../models/user.model');
const FacultyModel = require('../models/faculty.model');
const GroupModel = require('../models/group.model');
const BaseController = require('./BaseController');
const HttpException = require('../utils/HttpException.utils');

class ResultController extends BaseController {
    create = async (req, res, next) => {
        const { testId, score, totalQuestions, startTime, endTime, answers } = req.body;
        const studentId = req.currentUser.id;

        // Check if already solved
        const existing = await ResultModel.findOne({ where: { testId, studentId } });
        if (existing) {
            throw new HttpException(400, 'Siz ushbu testni allaqachon topshirgansiz!');
        }

        const test = await TestModel.findOne({ where: { id: testId } });
        if (!test) {
            throw new HttpException(404, 'Test topilmadi');
        }

        const percentage = totalQuestions ? (score / totalQuestions) * 100 : 0;
        const earnedScore = Number(((Number(test.maxScore || 100) * percentage) / 100).toFixed(2));

        const result = await ResultModel.create({
            testId,
            studentId,
            score,
            totalQuestions,
            percentage,
            earnedScore,
            startTime,
            endTime,
            answers
        });

        res.status(201).send(result);
    };

    getById = async (req, res, next) => {
        const result = await ResultModel.findOne({
            where: { id: req.params.id },
            include: [
                {
                    model: UserModel,
                    as: 'student',
                    attributes: ['firstname', 'lastname', 'phone'],
                    include: [
                        { model: FacultyModel, attributes: ['name'] },
                        { model: GroupModel, attributes: ['name'] }
                    ]
                },
                { model: TestModel, include: ['questions'] }
            ]
        });
        if (!result) throw new HttpException(404, 'Natija topilmadi');
        res.send(result);
    };

    getByTest = async (req, res, next) => {
        const results = await ResultModel.findAll({
            where: { testId: req.params.testId },
            include: [
                {
                    model: UserModel,
                    as: 'student',
                    attributes: ['firstname', 'lastname', 'phone'],
                    include: [
                        { model: FacultyModel, attributes: ['name'] },
                        { model: GroupModel, attributes: ['name'] }
                    ]
                }
            ],
            order: [['percentage', 'DESC']]
        });
        res.send(results);
    };

    getMyResults = async (req, res, next) => {
        const results = await ResultModel.findAll({
            where: { studentId: req.currentUser.id },
            include: [
                { model: TestModel, attributes: ['id', 'name', 'maxScore'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.send(results);
    };
}

module.exports = new ResultController;
