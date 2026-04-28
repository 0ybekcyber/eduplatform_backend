const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db/db-sequelize');
const FacultyModel = require('./faculty.model');
const GroupModel = require('./group.model');

class UserModel extends Model {
    toJSON() {//password ni ko'rsatmaslik uchun
        let values = Object.assign({}, this.get());
        delete values.password;
        return values;
    }
}

UserModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    password: {
        type: DataTypes.STRING(60),
        allowNull: false,
    },
    firstname: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    lastname: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('Admin', 'Teacher', 'Student'),
        defaultValue: 'Admin'
    },
    facultyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: FacultyModel,
            key: 'id'
        }
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: GroupModel,
            key: 'id'
        }
    },
    image: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    gender: {
        type: DataTypes.ENUM('Erkak', 'Ayol'),
        defaultValue: 'Erkak'
    },
    token: {
        type: DataTypes.VIRTUAL,
    },
}, {
    sequelize,
    modelName: 'UserModel',
    tableName: 'user',
    timestamps: true,
    paranoid: true,
});

FacultyModel.hasMany(UserModel, { foreignKey: 'facultyId' });
UserModel.belongsTo(FacultyModel, { foreignKey: 'facultyId' });

GroupModel.hasMany(UserModel, { foreignKey: 'groupId' });
UserModel.belongsTo(GroupModel, { foreignKey: 'groupId' });

module.exports = UserModel;