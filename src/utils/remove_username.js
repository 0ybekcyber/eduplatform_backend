const sequelize = require('../db/db-sequelize');

async function removeUsernameColumn() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('user');

        if (tableInfo.username) {
            console.log('Removing username column...');
            await queryInterface.removeColumn('user', 'username');
            console.log('Username column removed.');
        } else {
            console.log('Username column does not exist.');
        }

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await sequelize.close();
    }
}

removeUsernameColumn();
