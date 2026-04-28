const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const TestModel = require('./test.model');

class QuestionModel extends Model {}

QuestionModel.init({
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
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    options: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('options');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('options', JSON.stringify(value));
        }
    },
    correctAnswer: {
        type: DataTypes.STRING(255), // The exact text of the correct option
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'QuestionModel',
    tableName: 'question',
    timestamps: true,
});

TestModel.hasMany(QuestionModel, { as: 'questions', foreignKey: 'testId', onDelete: 'CASCADE' });
QuestionModel.belongsTo(TestModel, { foreignKey: 'testId' });

module.exports = QuestionModel;
