'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('user');
    if (!table.image) {
      await queryInterface.addColumn('user', 'image', {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('user');
    if (table.image) {
      await queryInterface.removeColumn('user', 'image');
    }
  }
};
