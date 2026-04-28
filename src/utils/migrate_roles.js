const sequelize = require('../db/db-sequelize');

async function updateRolesEnum() {
    try {
        console.log('Migrating existing roles to new roles...');
        // Map old roles to new ones to ensure migration
        await sequelize.query("UPDATE user SET role = 'Teacher' WHERE role IN ('Programmer', 'Agent', 'Yetkazuvchi')");
        await sequelize.query("UPDATE user SET role = 'Student' WHERE role IN ('User')");
        // Already 'Admin' stays 'Admin'

        console.log('Updating role ENUM definition...');
        // MySQL specific alter enum (easiest way is to modify the column)
        await sequelize.query("ALTER TABLE user MODIFY role ENUM('Admin', 'Teacher', 'Student') DEFAULT 'Admin'");

        console.log('Role migration and ENUM update completed successfully.');
    } catch (error) {
        console.error('Error during role migration:', error);
    } finally {
        await sequelize.close();
    }
}

updateRolesEnum();
