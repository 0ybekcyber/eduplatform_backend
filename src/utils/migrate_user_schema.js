const sequelize = require('../db/db-sequelize');
const { DataTypes } = require('sequelize');

async function migrateUserTable() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('user');

        if (!tableInfo.firstname) {
            console.log('Adding firstname and lastname columns...');
            await queryInterface.addColumn('user', 'firstname', {
                type: DataTypes.STRING(30),
                allowNull: true // Temporarily allow null for migration
            });
            await queryInterface.addColumn('user', 'lastname', {
                type: DataTypes.STRING(30),
                allowNull: true // Temporarily allow null for migration
            });
            console.log('Columns added.');

            // Attempt to migrate data
            if (tableInfo.fullname) {
                console.log('Migrating data from fullname...');
                const [users] = await sequelize.query('SELECT id, fullname FROM user');
                for (const user of users) {
                    if (user.fullname) {
                        const parts = user.fullname.split(' ');
                        const firstname = parts[0] || 'Unknown';
                        const lastname = parts.slice(1).join(' ') || 'Unknown';
                        await sequelize.query('UPDATE user SET firstname = ?, lastname = ? WHERE id = ?', {
                            replacements: [firstname, lastname, user.id]
                        });
                    }
                }
                console.log('Data migrated.');
            }
        }

        // Set columns to not null if they were just added
        await sequelize.query('ALTER TABLE user MODIFY firstname VARCHAR(30) NOT NULL');
        await sequelize.query('ALTER TABLE user MODIFY lastname VARCHAR(30) NOT NULL');

        if (tableInfo.fullname) {
            console.log('Removing fullname column...');
            await queryInterface.removeColumn('user', 'fullname');
            console.log('Fullname column removed.');
        }

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await sequelize.close();
    }
}

migrateUserTable();
