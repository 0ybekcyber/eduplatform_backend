const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const FacultyModel = require('./faculty.model');

class GroupModel extends Model {}

GroupModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    facultyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: FacultyModel,
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'GroupModel',
    tableName: 'group',
    timestamps: true,
    paranoid: true,
});

FacultyModel.hasMany(GroupModel, { foreignKey: 'facultyId' });
GroupModel.belongsTo(FacultyModel, { foreignKey: 'facultyId' });

module.exports = GroupModel;
