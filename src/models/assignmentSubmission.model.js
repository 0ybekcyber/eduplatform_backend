const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const AssignmentModel = require('./assignment.model');
const UserModel = require('./user.model');

class AssignmentSubmissionModel extends Model {}

AssignmentSubmissionModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: AssignmentModel,
            key: 'id'
        }
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: UserModel,
            key: 'id'
        }
    },
    textAnswer: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    attachment: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        get() {
            const val = this.getDataValue('attachment');
            return val ? JSON.parse(val) : null;
        },
        set(val) {
            this.setDataValue('attachment', val ? JSON.stringify(val) : null);
        }
    },
    gradeScore: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'AssignmentSubmissionModel',
    tableName: 'assignment_submission',
    timestamps: true,
});

AssignmentModel.hasMany(AssignmentSubmissionModel, { as: 'submissions', foreignKey: 'assignmentId', onDelete: 'CASCADE' });
AssignmentSubmissionModel.belongsTo(AssignmentModel, { foreignKey: 'assignmentId' });

UserModel.hasMany(AssignmentSubmissionModel, { as: 'assignmentSubmissions', foreignKey: 'studentId' });
AssignmentSubmissionModel.belongsTo(UserModel, { as: 'student', foreignKey: 'studentId' });

module.exports = AssignmentSubmissionModel;
