const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const UserModel = require('./user.model');

class AssignmentModel extends Model {}

AssignmentModel.init({
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
            this.setDataValue('facultyIds', JSON.stringify(val || []));
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
            this.setDataValue('groupIds', JSON.stringify(val || []));
        }
    },
    deadline: {
        type: DataTypes.DATE,
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
    }
}, {
    sequelize,
    modelName: 'AssignmentModel',
    tableName: 'assignment',
    timestamps: true,
    paranoid: true,
});

UserModel.hasMany(AssignmentModel, { foreignKey: 'teacherId' });
AssignmentModel.belongsTo(UserModel, { as: 'teacher', foreignKey: 'teacherId' });

module.exports = AssignmentModel;
