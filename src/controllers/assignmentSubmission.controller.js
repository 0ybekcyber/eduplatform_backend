const AssignmentSubmissionModel = require('../models/assignmentSubmission.model');
const AssignmentModel = require('../models/assignment.model');
const UserModel = require('../models/user.model');
const FacultyModel = require('../models/faculty.model');
const GroupModel = require('../models/group.model');
const BaseController = require('./BaseController');
const HttpException = require('../utils/HttpException.utils');
const assignmentController = require('./assignment.controller');

class AssignmentSubmissionController extends BaseController {
    create = async (req, res, next) => {
        const { assignmentId, textAnswer, attachment } = req.body;
        const studentId = req.currentUser.id;

        const assignment = await AssignmentModel.findOne({ where: { id: assignmentId } });
        if (!assignment) {
            throw new HttpException(404, 'Topshiriq topilmadi');
        }

        if (!assignmentController.canStudentAccessAssignment(req.currentUser, assignment)) {
            throw new HttpException(403, 'Siz bu topshiriqni topshira olmaysiz');
        }

        if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
            throw new HttpException(400, 'Topshiriq muddati tugagan');
        }

        const existing = await AssignmentSubmissionModel.findOne({ where: { assignmentId, studentId } });
        if (existing) {
            throw new HttpException(400, 'Siz bu topshiriqni allaqachon topshirgansiz');
        }

        const safeTextAnswer = (textAnswer || '').trim();
        const safeAttachment = assignmentController.normalizeAttachment(attachment, 'assignment-submissions');

        if (!safeTextAnswer && !safeAttachment) {
            throw new HttpException(400, 'Matn yoki fayl yuborilishi kerak');
        }

        const submission = await AssignmentSubmissionModel.create({
            assignmentId,
            studentId,
            textAnswer: safeTextAnswer || null,
            attachment: safeAttachment
        });

        res.status(201).send(submission);
    };

    getByAssignment = async (req, res, next) => {
        const assignment = await AssignmentModel.findOne({ where: { id: req.params.assignmentId } });
        if (!assignment) {
            throw new HttpException(404, 'Topshiriq topilmadi');
        }

        if (req.currentUser?.role === 'Teacher' && Number(assignment.teacherId) !== Number(req.currentUser.id)) {
            throw new HttpException(403, 'Siz faqat o`zingizning topshiriqlaringiz javoblarini ko`ra olasiz');
        }

        if (req.currentUser?.role === 'Student') {
            throw new HttpException(403, 'Sizda bu amal uchun ruxsat yo`q');
        }

        const submissions = await AssignmentSubmissionModel.findAll({
            where: { assignmentId: req.params.assignmentId },
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
            order: [['createdAt', 'DESC']]
        });

        res.send(submissions);
    };

    getMySubmissions = async (req, res, next) => {
        if (req.currentUser?.role !== 'Student') {
            throw new HttpException(403, 'Bu bo`lim faqat talabalar uchun');
        }

        const submissions = await AssignmentSubmissionModel.findAll({
            where: { studentId: req.currentUser.id }
        });

        res.send(submissions);
    };

    grade = async (req, res, next) => {
        const submission = await AssignmentSubmissionModel.findOne({
            where: { id: req.params.id },
            include: [{ model: AssignmentModel }]
        });

        if (!submission) {
            throw new HttpException(404, 'Javob topilmadi');
        }

        const assignment = submission.AssignmentModel;

        if (req.currentUser?.role === 'Student') {
            throw new HttpException(403, 'Sizda bu amal uchun ruxsat yo`q');
        }

        if (req.currentUser?.role === 'Teacher' && Number(assignment.teacherId) !== Number(req.currentUser.id)) {
            throw new HttpException(403, 'Siz faqat o`zingizning topshiriqlaringizni baholay olasiz');
        }

        const gradeScore = Number(req.body.gradeScore);
        const maxScore = Number(assignment.maxScore || 100);

        if (Number.isNaN(gradeScore) || gradeScore < 0 || gradeScore > maxScore) {
            throw new HttpException(400, `Ball 0 dan ${maxScore} gacha bo'lishi kerak`);
        }

        await submission.update({ gradeScore });
        res.send(submission);
    };
}

module.exports = new AssignmentSubmissionController();
