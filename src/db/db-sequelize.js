const { Sequelize } = require('sequelize');
const config = require('../startup/config');

const sequelize = new Sequelize(
    config.db_name,
    config.db_user,
    config.db_pass,
    {
        host: config.host,
        port: config.db_port,
        dialect: 'mysql',
        timezone: '+05:00',
        dialectOptions: {
            decimalNumbers: true,
            multipleStatements: true,
            useUTC: false, // for reading from database
        },
        logging: config.node_env !== 'production'
    }
);


module.exports = sequelize;