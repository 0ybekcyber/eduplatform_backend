'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM user WHERE email = ? LIMIT 1',
        {
          replacements: ['admin@edutest.local'],
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (!existing) {
        await queryInterface.bulkInsert(
          'user',
          [
            {
              email: 'admin@edutest.local',
              phone: null,
              password: '$2a$08$YLZ7gtHc5KgiF3TlX/12r.boof4dIvGSoViUYxaRL8f7yHhKjPh0i',
              firstname: 'Portal',
              lastname: 'Admin',
              role: 'Admin',
              facultyId: null,
              groupId: null,
              image: null,
              gender: 'Erkak',
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null
            }
          ],
          { transaction }
        );
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
      await queryInterface.bulkDelete('user', { email: 'admin@edutest.local' }, { transaction });
      await transaction.commit();
    } catch (errors) {
      await transaction.rollback();
      throw errors;
    }
  }
};
