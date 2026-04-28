const db = require('../db/db-sequelize');
const { DataTypes } = require('sequelize');
// let migration = require('./migration');
require('../models/user.model');
require('../models/faculty.model');
require('../models/group.model');
require('../models/test.model');
require('../models/question.model');
require('../models/result.model');
require('../models/assignment.model');
require('../models/assignmentSubmission.model');

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
    const table = await queryInterface.describeTable(tableName);
    if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
    }
};

const ensureScoringColumns = async () => {
    const queryInterface = db.getQueryInterface();
    await addColumnIfMissing(queryInterface, 'test', 'maxScore', {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100
    });
    await addColumnIfMissing(queryInterface, 'result', 'earnedScore', {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, 'assignment', 'maxScore', {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100
    });
    await addColumnIfMissing(queryInterface, 'assignment_submission', 'gradeScore', {
        type: DataTypes.FLOAT,
        allowNull: true
    });
};

module.exports = async function(){
    await db.sync();
    await ensureScoringColumns();
    db.authenticate()
    .then(() => {
        console.log('Baza bilan aloqa ulandi');
        // migration();
    })
    // .catch(err => { Global exception hadler borligi uchun
    //     console.error('Baza bilan aloqa uzildi xatolik ->:', err);
    // });
}
