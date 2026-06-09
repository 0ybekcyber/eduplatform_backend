const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const UserModel = require('./user.model');

class QuestionBankItemModel extends Model {}

QuestionBankItemModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    teacherId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: UserModel,
            key: 'id'
        }
    },
    subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'Umumiy'
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
            this.setDataValue('options', JSON.stringify(value || []));
        }
    },
    correctAnswer: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'QuestionBankItemModel',
    tableName: 'question_bank_item',
    timestamps: true,
});

UserModel.hasMany(QuestionBankItemModel, { foreignKey: 'teacherId' });
QuestionBankItemModel.belongsTo(UserModel, { as: 'teacher', foreignKey: 'teacherId' });

module.exports = QuestionBankItemModel;
