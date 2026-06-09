'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('user')) {
        await queryInterface.createTable('user', {
          id: {
            autoIncrement: true,
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
          },
          email: {
            type: Sequelize.DataTypes.STRING(50),
            allowNull: false,
            unique: true
          },
          phone: {
            type: Sequelize.DataTypes.STRING(20),
            allowNull: true
          },
          password: {
            type: Sequelize.DataTypes.STRING(60),
            allowNull: false
          },
          firstname: {
            type: Sequelize.DataTypes.STRING(30),
            allowNull: false
          },
          lastname: {
            type: Sequelize.DataTypes.STRING(30),
            allowNull: false
          },
          role: {
            type: Sequelize.DataTypes.ENUM('Admin', 'Teacher', 'Student'),
            allowNull: true,
            defaultValue: 'Admin'
          },
          facultyId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
          },
          groupId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: true
          },
          image: {
            type: Sequelize.DataTypes.TEXT('long'),
            allowNull: true
          },
          gender: {
            type: Sequelize.DataTypes.ENUM('Erkak', 'Ayol'),
            allowNull: true,
            defaultValue: 'Erkak'
          },
          createdAt: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updatedAt: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          deletedAt: {
            type: Sequelize.DataTypes.DATE,
            allowNull: true
          },
        }, { transaction });
      }

      await transaction.commit();
    } catch (errors) {
      await transaction.rollback();
      throw errors;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables();
      if (tables.includes('user')) {
        await queryInterface.dropTable('user', { transaction });
      }
      
      await transaction.commit();
    } catch (errors) {
      await transaction.rollback();
      throw errors;
    }
  }
};
