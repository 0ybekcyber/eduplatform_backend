const AssignmentModel = require('../models/assignment.model');
const AssignmentSubmissionModel = require('../models/assignmentSubmission.model');
const UserModel = require('../models/user.model');
const BaseController = require('./BaseController');
const HttpException = require('../utils/HttpException.utils');
const { saveBase64File, removeStoredFile } = require('../utils/fileStorage.utils');

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 3;
const ALLOWED_FILE_TYPES = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
];

class AssignmentController extends BaseController {
    ensureStaffAccess = (user, assignment = null) => {
        if (user?.role === 'Student') {
            throw new HttpException(403, 'Sizda bu amal uchun ruxsat yo`q');
        }

        if (assignment && user?.role === 'Teacher' && Number(assignment.teacherId) !== Number(user.id)) {
            throw new HttpException(403, 'Siz faqat o`zingizning topshiriqlaringizni boshqara olasiz');
        }
    };

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

    canStudentAccessAssignment = (student, assignment) => {
        const assignmentFacultyIds = this.parseIds(assignment.facultyIds);
        const assignmentGroupIds = this.parseIds(assignment.groupIds);

        const hasFacultyLimit = assignmentFacultyIds.length > 0;
        const hasGroupLimit = assignmentGroupIds.length > 0;

        if (!hasFacultyLimit && !hasGroupLimit) {
            return true;
        }

        const studentFacultyId = student?.facultyId ? Number(student.facultyId) : null;
        const studentGroupId = student?.groupId ? Number(student.groupId) : null;

        const sameFaculty = !hasFacultyLimit || (studentFacultyId !== null && assignmentFacultyIds.includes(studentFacultyId));
        const sameGroup = !hasGroupLimit || (studentGroupId !== null && assignmentGroupIds.includes(studentGroupId));

        return sameFaculty && sameGroup;
    };

    normalizeAttachment = (attachment, targetFolder = 'assignments') => {
        if (!attachment) return null;

        const fileName = attachment.fileName || attachment.name;
        const mimeType = attachment.mimeType || attachment.type;
        const dataUrl = attachment.dataUrl;
        const size = Number(attachment.size || 0);

        if (!dataUrl && attachment.url) {
            return {
                fileName,
                mimeType,
                size,
                filePath: attachment.filePath || null,
                relativePath: attachment.relativePath || null,
                url: attachment.url
            };
        }

        if (!fileName || !mimeType || !dataUrl) {
            throw new HttpException(400, 'Fayl ma\'lumotlari to\'liq emas');
        }

        if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
            throw new HttpException(400, 'Faqat DOC, DOCX yoki PDF fayl yuklash mumkin');
        }

        if (size > MAX_FILE_SIZE) {
            throw new HttpException(400, `Fayl hajmi ${MAX_FILE_SIZE_MB} MB dan oshmasligi kerak`);
        }

        const storedFile = saveBase64File({
            dataUrl,
            fileName,
            targetFolder
        });

        return {
            fileName,
            mimeType,
            size,
            filePath: storedFile.filePath,
            relativePath: storedFile.relativePath,
            url: storedFile.url
        };
    };

    getAll = async (req, res, next) => {
        const currentUser = req.currentUser;
        const role = currentUser?.role;

        const where = {};
        if (role === 'Teacher') {
            where.teacherId = currentUser.id;
        }

        const assignments = await AssignmentModel.findAll({
            where,
            include: [
                { model: UserModel, as: 'teacher', attributes: ['firstname', 'lastname'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const visibleAssignments = role === 'Student'
            ? assignments.filter(assignment => this.canStudentAccessAssignment(currentUser, assignment))
            : assignments;

        res.send(visibleAssignments);
    };

    create = async (req, res, next) => {
        const { name, description, maxScore, facultyIds, groupIds, deadline, attachment } = req.body;
        const teacherId = req.currentUser.id;
        const safeMaxScore = Number(maxScore || 100);

        this.ensureStaffAccess(req.currentUser);

        if (!name) {
            throw new HttpException(400, 'Topshiriq nomi majburiy');
        }

        if (!safeMaxScore || safeMaxScore <= 0) {
            throw new HttpException(400, 'Topshiriq bali 0 dan katta bo`lishi kerak');
        }

        const assignment = await AssignmentModel.create({
            name,
            description,
            maxScore: safeMaxScore,
            facultyIds: this.parseIds(facultyIds),
            groupIds: this.parseIds(groupIds),
            deadline,
            teacherId,
            attachment: this.normalizeAttachment(attachment, 'assignments')
        });

        res.status(201).send(assignment);
    };

    update = async (req, res, next) => {
        const { name, description, maxScore, facultyIds, groupIds, deadline, attachment } = req.body;
        const assignment = await AssignmentModel.findOne({ where: { id: req.params.id } });
        const safeMaxScore = Number(maxScore || 100);

        if (!assignment) {
            throw new HttpException(404, 'Topshiriq topilmadi');
        }

        this.ensureStaffAccess(req.currentUser, assignment);

        if (!safeMaxScore || safeMaxScore <= 0) {
            throw new HttpException(400, 'Topshiriq bali 0 dan katta bo`lishi kerak');
        }

        const nextAttachment = attachment === null
            ? null
            : this.normalizeAttachment(attachment, 'assignments');

        const previousAttachment = assignment.attachment;

        await assignment.update({
            name,
            description,
            maxScore: safeMaxScore,
            facultyIds: this.parseIds(facultyIds),
            groupIds: this.parseIds(groupIds),
            deadline,
            attachment: nextAttachment
        });

        const newUploadCreated = nextAttachment && nextAttachment.filePath && nextAttachment.filePath !== previousAttachment?.filePath;
        const removedExistingFile = !nextAttachment && previousAttachment?.filePath;

        if (newUploadCreated || removedExistingFile) {
            removeStoredFile(previousAttachment);
        }

        res.send(assignment);
    };

    delete = async (req, res, next) => {
        const assignment = await AssignmentModel.findOne({ where: { id: req.params.id } });

        if (!assignment) {
            throw new HttpException(404, 'Topshiriq topilmadi');
        }

        this.ensureStaffAccess(req.currentUser, assignment);

        const submissions = await AssignmentSubmissionModel.findAll({
            where: { assignmentId: assignment.id }
        });

        removeStoredFile(assignment.attachment);
        submissions.forEach(submission => removeStoredFile(submission.attachment));
        await AssignmentSubmissionModel.destroy({ where: { assignmentId: assignment.id } });
        await assignment.destroy();
        res.send('Topshiriq o\'chirildi');
    };

    getStats = async (req, res, next) => {
        const currentUser = req.currentUser;
        const role = currentUser?.role;

        const where = {};
        if (role === 'Teacher') {
            where.teacherId = currentUser.id;
        }

        const assignments = await AssignmentModel.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [
                { model: UserModel, as: 'teacher', attributes: ['firstname', 'lastname'] }
            ]
        });

        const visibleAssignments = role === 'Student'
            ? assignments.filter(assignment => this.canStudentAccessAssignment(currentUser, assignment))
            : assignments;

        let submissionsWhere = {};
        if (role === 'Student') {
            submissionsWhere.studentId = currentUser.id;
        } else if (visibleAssignments.length) {
            submissionsWhere.assignmentId = visibleAssignments.map(item => item.id);
        } else {
            submissionsWhere.assignmentId = null;
        }

        const submissions = await AssignmentSubmissionModel.findAll({
            where: submissionsWhere
        });

        const submittedAssignmentIds = new Set(submissions.map(item => item.assignmentId));
        const pendingAssignments = role === 'Student'
            ? visibleAssignments.filter(item => !submittedAssignmentIds.has(item.id))
            : [];

        res.send({
            assignmentCount: visibleAssignments.length,
            submissionCount: submissions.length,
            recentAssignments: visibleAssignments.slice(0, 5),
            pendingAssignments
        });
    };
}

module.exports = new AssignmentController();
