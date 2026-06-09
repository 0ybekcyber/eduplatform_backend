const TestModel = require('../models/test.model');
const QuestionModel = require('../models/question.model');
const ResultModel = require('../models/result.model');
const AssignmentModel = require('../models/assignment.model');
const AssignmentSubmissionModel = require('../models/assignmentSubmission.model');
const UserModel = require('../models/user.model');
const FacultyModel = require('../models/faculty.model');
const GroupModel = require('../models/group.model');

class ReportController {
    parseIds = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(Number).filter(id => !Number.isNaN(id) && id > 0);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed.map(Number).filter(id => !Number.isNaN(id) && id > 0);
            } catch (e) {
                const num = Number(value);
                return Number.isNaN(num) || num <= 0 ? [] : [num];
            }
        }
        const num = Number(value);
        return Number.isNaN(num) || num <= 0 ? [] : [num];
    };

    canStudentAccess = (student, item) => {
        const facultyIds = this.parseIds(item.facultyIds);
        const groupIds = this.parseIds(item.groupIds);
        const studentIds = this.parseIds(item.studentIds);

        if (!facultyIds.length && !groupIds.length && !studentIds.length) return true;

        const studentId = Number(student.id);
        const studentFacultyId = student.facultyId ? Number(student.facultyId) : null;
        const studentGroupId = student.groupId ? Number(student.groupId) : null;

        const sameStudent = !studentIds.length || studentIds.includes(studentId);
        const sameFaculty = !facultyIds.length || (studentFacultyId !== null && facultyIds.includes(studentFacultyId));
        const sameGroup = !groupIds.length || (studentGroupId !== null && groupIds.includes(studentGroupId));

        return sameStudent && sameFaculty && sameGroup;
    };

    average = (items, selector) => {
        const values = items.map(selector).map(Number).filter(value => !Number.isNaN(value));
        if (!values.length) return 0;
        return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
    };

    percent = (part, total) => {
        if (!total) return 0;
        return Math.round((part / total) * 100);
    };

    getAdminReports = async (req, res, next) => {
        const [users, tests, results, assignments, submissions] = await Promise.all([
            UserModel.findAll({
                include: [
                    { model: FacultyModel, attributes: ['id', 'name'] },
                    { model: GroupModel, attributes: ['id', 'name'] }
                ],
                order: [['firstname', 'ASC'], ['lastname', 'ASC']]
            }),
            TestModel.findAll({
                include: [
                    { model: UserModel, as: 'teacher', attributes: ['id', 'firstname', 'lastname'] },
                    { model: QuestionModel, as: 'questions', attributes: ['id'] }
                ],
                order: [['createdAt', 'DESC']]
            }),
            ResultModel.findAll(),
            AssignmentModel.findAll({
                include: [
                    { model: UserModel, as: 'teacher', attributes: ['id', 'firstname', 'lastname'] }
                ],
                order: [['createdAt', 'DESC']]
            }),
            AssignmentSubmissionModel.findAll()
        ]);

        const students = users.filter(user => user.role === 'Student');
        const teachers = users.filter(user => user.role === 'Teacher');

        const resultsByTestId = new Map();
        results.forEach(result => {
            const key = Number(result.testId);
            if (!resultsByTestId.has(key)) resultsByTestId.set(key, []);
            resultsByTestId.get(key).push(result);
        });

        const submissionsByAssignmentId = new Map();
        submissions.forEach(submission => {
            const key = Number(submission.assignmentId);
            if (!submissionsByAssignmentId.has(key)) submissionsByAssignmentId.set(key, []);
            submissionsByAssignmentId.get(key).push(submission);
        });

        const testReports = tests.map(test => {
            const testResults = resultsByTestId.get(Number(test.id)) || [];
            const assignedStudents = students.filter(student => this.canStudentAccess(student, test)).length;
            const completedCount = testResults.length;
            return {
                id: test.id,
                name: test.name,
                teacherId: test.teacherId,
                teacherName: `${test.teacher?.firstname || ''} ${test.teacher?.lastname || ''}`.trim() || 'Noma`lum',
                questionCount: test.questions?.length || 0,
                maxScore: Number(test.maxScore || 100),
                assignedStudents,
                completedCount,
                pendingCount: Math.max(0, assignedStudents - completedCount),
                completionPercent: this.percent(completedCount, assignedStudents),
                averagePercent: this.average(testResults, result => result.percentage),
                averageScore: this.average(testResults, result => result.earnedScore),
                deadline: test.deadline,
                createdAt: test.createdAt
            };
        });

        const assignmentReports = assignments.map(assignment => {
            const assignmentSubmissions = submissionsByAssignmentId.get(Number(assignment.id)) || [];
            const assignedStudents = students.filter(student => this.canStudentAccess(student, assignment)).length;
            const submittedCount = assignmentSubmissions.length;
            const gradedCount = assignmentSubmissions.filter(item => item.gradeScore !== null && item.gradeScore !== undefined).length;
            return {
                id: assignment.id,
                name: assignment.name,
                teacherId: assignment.teacherId,
                teacherName: `${assignment.teacher?.firstname || ''} ${assignment.teacher?.lastname || ''}`.trim() || 'Noma`lum',
                maxScore: Number(assignment.maxScore || 100),
                assignedStudents,
                submittedCount,
                pendingCount: Math.max(0, assignedStudents - submittedCount),
                gradedCount,
                ungradedCount: Math.max(0, submittedCount - gradedCount),
                submissionPercent: this.percent(submittedCount, assignedStudents),
                averageGrade: this.average(assignmentSubmissions.filter(item => item.gradeScore !== null && item.gradeScore !== undefined), item => item.gradeScore),
                deadline: assignment.deadline,
                createdAt: assignment.createdAt
            };
        });

        const staffUsers = users.filter(user => {
            const isStaffRole = user.role === 'Teacher' || user.role === 'Admin';
            const hasCreatedWork = tests.some(test => Number(test.teacherId) === Number(user.id))
                || assignments.some(assignment => Number(assignment.teacherId) === Number(user.id));
            return isStaffRole || hasCreatedWork;
        });

        const teacherReports = staffUsers.map(teacher => {
            const teacherTests = testReports.filter(test => Number(test.teacherId) === Number(teacher.id));
            const teacherAssignments = assignmentReports.filter(item => Number(item.teacherId) === Number(teacher.id));
            const teacherResults = teacherTests.flatMap(test => resultsByTestId.get(Number(test.id)) || []);
            const teacherSubmissions = teacherAssignments.flatMap(item => submissionsByAssignmentId.get(Number(item.id)) || []);
            const gradedSubmissions = teacherSubmissions.filter(item => item.gradeScore !== null && item.gradeScore !== undefined);

            return {
                id: teacher.id,
                name: `${teacher.firstname || ''} ${teacher.lastname || ''}`.trim(),
                role: teacher.role,
                phone: teacher.phone || '',
                testsCount: teacherTests.length,
                assignmentsCount: teacherAssignments.length,
                questionsCount: teacherTests.reduce((sum, test) => sum + test.questionCount, 0),
                testResultsCount: teacherResults.length,
                averageTestPercent: this.average(teacherResults, result => result.percentage),
                assignmentSubmissionsCount: teacherSubmissions.length,
                gradedSubmissionsCount: gradedSubmissions.length,
                averageAssignmentGrade: this.average(gradedSubmissions, item => item.gradeScore)
            };
        });

        const studentReports = students.map(student => {
            const availableTests = tests.filter(test => this.canStudentAccess(student, test));
            const availableAssignments = assignments.filter(assignment => this.canStudentAccess(student, assignment));
            const studentResults = results.filter(result => Number(result.studentId) === Number(student.id));
            const studentSubmissions = submissions.filter(submission => Number(submission.studentId) === Number(student.id));
            const gradedSubmissions = studentSubmissions.filter(item => item.gradeScore !== null && item.gradeScore !== undefined);

            return {
                id: student.id,
                name: `${student.firstname || ''} ${student.lastname || ''}`.trim(),
                phone: student.phone || '',
                facultyName: student.FacultyModel?.name || 'Kiritilmagan',
                groupName: student.GroupModel?.name || 'Kiritilmagan',
                assignedTestsCount: availableTests.length,
                completedTestsCount: studentResults.length,
                pendingTestsCount: Math.max(0, availableTests.length - studentResults.length),
                averageTestPercent: this.average(studentResults, result => result.percentage),
                averageTestScore: this.average(studentResults, result => result.earnedScore),
                assignedAssignmentsCount: availableAssignments.length,
                submittedAssignmentsCount: studentSubmissions.length,
                pendingAssignmentsCount: Math.max(0, availableAssignments.length - studentSubmissions.length),
                gradedAssignmentsCount: gradedSubmissions.length,
                averageAssignmentGrade: this.average(gradedSubmissions, item => item.gradeScore)
            };
        });

        res.send({
            generatedAt: new Date(),
            summary: {
                usersCount: users.length,
                studentsCount: students.length,
                teachersCount: teachers.length,
                testsCount: tests.length,
                assignmentsCount: assignments.length,
                testResultsCount: results.length,
                assignmentSubmissionsCount: submissions.length,
                averageTestPercent: this.average(results, result => result.percentage),
                averageAssignmentGrade: this.average(submissions.filter(item => item.gradeScore !== null && item.gradeScore !== undefined), item => item.gradeScore)
            },
            tests: testReports,
            assignments: assignmentReports,
            teachers: teacherReports,
            students: studentReports
        });
    };
}

module.exports = new ReportController();
