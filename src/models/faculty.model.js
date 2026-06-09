const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');

class FacultyModel extends Model {}

FacultyModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'FacultyModel',
    tableName: 'faculty',
    timestamps: true,
    paranoid: true,
});

module.exports = FacultyModel;
