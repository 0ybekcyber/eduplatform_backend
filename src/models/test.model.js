const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const UserModel = require('./user.model');
const FacultyModel = require('./faculty.model');
const GroupModel = require('./group.model');

class TestModel extends Model {}

TestModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
        allowNull: false
    },
    maxScore: {
        type: DataTypes.FLOAT,
        defaultValue: 100,
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
    facultyIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const val = this.getDataValue('facultyIds');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('facultyIds', JSON.stringify(val));
        }
    },
    groupIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const val = this.getDataValue('groupIds');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('groupIds', JSON.stringify(val));
        }
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'TestModel',
    tableName: 'test',
    timestamps: true,
    paranoid: true,
});

UserModel.hasMany(TestModel, { foreignKey: 'teacherId' });
TestModel.belongsTo(UserModel, { as: 'teacher', foreignKey: 'teacherId' });

module.exports = TestModel;
