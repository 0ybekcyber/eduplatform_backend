const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const TestModel = require('./test.model');
const UserModel = require('./user.model');

class ResultModel extends Model {}

ResultModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    testId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TestModel,
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
    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    percentage: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    earnedScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: false
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    answers: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const val = this.getDataValue('answers');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('answers', JSON.stringify(val));
        }
    }
}, {
    sequelize,
    modelName: 'ResultModel',
    tableName: 'result',
    timestamps: true,
});

TestModel.hasMany(ResultModel, { as: 'results', foreignKey: 'testId' });
ResultModel.belongsTo(TestModel, { foreignKey: 'testId' });

UserModel.hasMany(ResultModel, { as: 'testResults', foreignKey: 'studentId' });
ResultModel.belongsTo(UserModel, { as: 'student', foreignKey: 'studentId' });

module.exports = ResultModel;
