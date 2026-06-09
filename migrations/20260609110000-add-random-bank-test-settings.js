'use strict';

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition, transaction) => {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition, { transaction });
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await addColumnIfMissing(queryInterface, 'test', 'isBankRandomized', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, transaction);
      await addColumnIfMissing(queryInterface, 'test', 'bankSubject', {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true
      }, transaction);
      await addColumnIfMissing(queryInterface, 'test', 'bankQuestionCount', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true
      }, transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('test');
      if (table.bankQuestionCount) await queryInterface.removeColumn('test', 'bankQuestionCount', { transaction });
      if (table.bankSubject) await queryInterface.removeColumn('test', 'bankSubject', { transaction });
      if (table.isBankRandomized) await queryInterface.removeColumn('test', 'isBankRandomized', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
