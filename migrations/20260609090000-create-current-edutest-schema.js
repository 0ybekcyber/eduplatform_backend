'use strict';

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition, transaction) => {
  const exists = await hasTable(queryInterface, tableName);
  if (!exists) return;

  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition, { transaction });
  }
};

const createTableIfMissing = async (queryInterface, tableName, columns, transaction) => {
  const exists = await hasTable(queryInterface, tableName);
  if (!exists) {
    await queryInterface.createTable(tableName, columns, { transaction });
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const timestamps = {
        createdAt: {
          type: Sequelize.DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      };
      const paranoid = {
        deletedAt: {
          type: Sequelize.DataTypes.DATE,
          allowNull: true
        }
      };

      await createTableIfMissing(queryInterface, 'faculty', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        name: { type: Sequelize.DataTypes.STRING(100), allowNull: false },
        ...timestamps,
        ...paranoid
      }, transaction);

      await createTableIfMissing(queryInterface, 'group', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        name: { type: Sequelize.DataTypes.STRING(50), allowNull: false },
        facultyId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'faculty', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        ...timestamps,
        ...paranoid
      }, transaction);

      await addColumnIfMissing(queryInterface, 'user', 'email', {
        type: Sequelize.DataTypes.STRING(50),
        allowNull: true,
        unique: true
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'phone', {
        type: Sequelize.DataTypes.STRING(20),
        allowNull: true
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'firstname', {
        type: Sequelize.DataTypes.STRING(30),
        allowNull: true
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'lastname', {
        type: Sequelize.DataTypes.STRING(30),
        allowNull: true
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'facultyId', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'faculty', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'groupId', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'group', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'gender', {
        type: Sequelize.DataTypes.ENUM('Erkak', 'Ayol'),
        allowNull: true,
        defaultValue: 'Erkak'
      }, transaction);
      await addColumnIfMissing(queryInterface, 'user', 'image', {
        type: Sequelize.DataTypes.TEXT('long'),
        allowNull: true
      }, transaction);

      const userTable = await queryInterface.describeTable('user');
      if (userTable.email && userTable.username) {
        await queryInterface.sequelize.query(
          "UPDATE user SET email = CONCAT(LOWER(REPLACE(username, ' ', '')), id, '@edutest.local') WHERE email IS NULL OR email = ''",
          { transaction }
        );
      }
      if (userTable.firstname && userTable.fullname) {
        await queryInterface.sequelize.query(
          "UPDATE user SET firstname = COALESCE(NULLIF(SUBSTRING_INDEX(fullname, ' ', 1), ''), 'Portal') WHERE firstname IS NULL OR firstname = ''",
          { transaction }
        );
      }
      if (userTable.lastname && userTable.fullname) {
        await queryInterface.sequelize.query(
          "UPDATE user SET lastname = COALESCE(NULLIF(TRIM(SUBSTRING(fullname, LENGTH(SUBSTRING_INDEX(fullname, ' ', 1)) + 1)), ''), 'User') WHERE lastname IS NULL OR lastname = ''",
          { transaction }
        );
      }
      if (userTable.role) {
        await queryInterface.sequelize.query(
          "UPDATE user SET role = 'Teacher' WHERE role IN ('Programmer', 'Agent', 'Yetkazuvchi')",
          { transaction }
        );
        await queryInterface.sequelize.query(
          "UPDATE user SET role = 'Student' WHERE role IN ('User')",
          { transaction }
        );
        await queryInterface.changeColumn('user', 'role', {
          type: Sequelize.DataTypes.ENUM('Admin', 'Teacher', 'Student'),
          allowNull: true,
          defaultValue: 'Admin'
        }, { transaction });
      }
      const normalizedUserTable = await queryInterface.describeTable('user');
      if (normalizedUserTable.email) {
        await queryInterface.changeColumn('user', 'email', {
          type: Sequelize.DataTypes.STRING(50),
          allowNull: false,
          unique: true
        }, { transaction });
      }
      if (normalizedUserTable.firstname) {
        await queryInterface.changeColumn('user', 'firstname', {
          type: Sequelize.DataTypes.STRING(30),
          allowNull: false
        }, { transaction });
      }
      if (normalizedUserTable.lastname) {
        await queryInterface.changeColumn('user', 'lastname', {
          type: Sequelize.DataTypes.STRING(30),
          allowNull: false
        }, { transaction });
      }
      if (normalizedUserTable.username) {
        await queryInterface.removeColumn('user', 'username', { transaction });
      }
      if (normalizedUserTable.fullname) {
        await queryInterface.removeColumn('user', 'fullname', { transaction });
      }

      await createTableIfMissing(queryInterface, 'test', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        name: { type: Sequelize.DataTypes.STRING(255), allowNull: false },
        description: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        duration: { type: Sequelize.DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
        maxScore: { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
        teacherId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'user', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        facultyIds: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        groupIds: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        studentIds: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        isBankRandomized: { type: Sequelize.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        bankSubject: { type: Sequelize.DataTypes.STRING(255), allowNull: true },
        bankQuestionCount: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
        deadline: { type: Sequelize.DataTypes.DATE, allowNull: true },
        ...timestamps,
        ...paranoid
      }, transaction);

      await createTableIfMissing(queryInterface, 'question', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        testId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'test', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        text: { type: Sequelize.DataTypes.TEXT, allowNull: false },
        options: { type: Sequelize.DataTypes.TEXT, allowNull: false },
        correctAnswer: { type: Sequelize.DataTypes.STRING(255), allowNull: false },
        ...timestamps
      }, transaction);

      await createTableIfMissing(queryInterface, 'result', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        testId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'test', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        studentId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'user', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        score: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
        totalQuestions: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
        percentage: { type: Sequelize.DataTypes.FLOAT, allowNull: false },
        earnedScore: { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
        startTime: { type: Sequelize.DataTypes.DATE, allowNull: true },
        endTime: { type: Sequelize.DataTypes.DATE, allowNull: true },
        answers: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        ...timestamps
      }, transaction);

      await createTableIfMissing(queryInterface, 'assignment', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        name: { type: Sequelize.DataTypes.STRING(255), allowNull: false },
        description: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        maxScore: { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
        teacherId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'user', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        facultyIds: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        groupIds: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        studentIds: { type: Sequelize.DataTypes.TEXT, allowNull: true },
        deadline: { type: Sequelize.DataTypes.DATE, allowNull: true },
        attachment: { type: Sequelize.DataTypes.TEXT('long'), allowNull: true },
        ...timestamps,
        ...paranoid
      }, transaction);

      await createTableIfMissing(queryInterface, 'assignment_submission', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        assignmentId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'assignment', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        studentId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'user', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        textAnswer: { type: Sequelize.DataTypes.TEXT('long'), allowNull: true },
        attachment: { type: Sequelize.DataTypes.TEXT('long'), allowNull: true },
        gradeScore: { type: Sequelize.DataTypes.FLOAT, allowNull: true },
        plagiarismScore: { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
        plagiarismReport: { type: Sequelize.DataTypes.TEXT('long'), allowNull: true },
        contentHash: { type: Sequelize.DataTypes.STRING(64), allowNull: true },
        extractedText: { type: Sequelize.DataTypes.TEXT('long'), allowNull: true },
        ...timestamps
      }, transaction);

      await createTableIfMissing(queryInterface, 'question_bank_item', {
        id: { type: Sequelize.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
        teacherId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'user', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        subject: { type: Sequelize.DataTypes.STRING(255), allowNull: false, defaultValue: 'Umumiy' },
        text: { type: Sequelize.DataTypes.TEXT, allowNull: false },
        options: { type: Sequelize.DataTypes.TEXT, allowNull: false },
        correctAnswer: { type: Sequelize.DataTypes.STRING(255), allowNull: false },
        ...timestamps
      }, transaction);

      const extraColumns = [
        ['test', 'maxScore', { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 100 }],
        ['test', 'studentIds', { type: Sequelize.DataTypes.TEXT, allowNull: true }],
        ['test', 'isBankRandomized', { type: Sequelize.DataTypes.BOOLEAN, allowNull: false, defaultValue: false }],
        ['test', 'bankSubject', { type: Sequelize.DataTypes.STRING(255), allowNull: true }],
        ['test', 'bankQuestionCount', { type: Sequelize.DataTypes.INTEGER, allowNull: true }],
        ['result', 'earnedScore', { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0 }],
        ['assignment', 'maxScore', { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 100 }],
        ['assignment', 'studentIds', { type: Sequelize.DataTypes.TEXT, allowNull: true }],
        ['assignment_submission', 'gradeScore', { type: Sequelize.DataTypes.FLOAT, allowNull: true }],
        ['assignment_submission', 'plagiarismScore', { type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0 }],
        ['assignment_submission', 'plagiarismReport', { type: Sequelize.DataTypes.TEXT('long'), allowNull: true }],
        ['assignment_submission', 'contentHash', { type: Sequelize.DataTypes.STRING(64), allowNull: true }],
        ['assignment_submission', 'extractedText', { type: Sequelize.DataTypes.TEXT('long'), allowNull: true }],
        ['question_bank_item', 'subject', { type: Sequelize.DataTypes.STRING(255), allowNull: false, defaultValue: 'Umumiy' }]
      ];

      for (const [tableName, columnName, definition] of extraColumns) {
        await addColumnIfMissing(queryInterface, tableName, columnName, definition, transaction);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = [
        'question_bank_item',
        'assignment_submission',
        'assignment',
        'result',
        'question',
        'test',
        'group',
        'faculty'
      ];

      for (const tableName of tables) {
        if (await hasTable(queryInterface, tableName)) {
          await queryInterface.dropTable(tableName, { transaction });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
