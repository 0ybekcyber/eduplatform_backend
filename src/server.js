const express = require("express");
const app = express();
require('./startup/logging')();
require('./startup/db')();
const { port } = require('./startup/config');
require('./startup/routes')(app);

// App start
app.listen(port, () => console.log(`🚀 Server running on port ${port}!`))
    .on('error', (e) => {
        // This error handler catches errors from the server listening process itself.
        // The provided code snippet for status 500 message concatenation
        // is typically found in an error handling middleware, not directly here.
        // To avoid syntax errors and faithfully apply the change,
        // this specific snippet cannot be directly inserted here as it relies
        // on 'status', 'message', 'req', and 'data' which are not available
        // in this context.
        console.log('Error happened: ', e.message)
    });

module.exports = app;