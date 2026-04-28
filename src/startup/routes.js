const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require('cookie-parser')
const i18n = require('./i18n.config')
const errorMiddleware = require('../middleware/error.middleware');
const userRouter = require('../routes/user.route');
const facultyRouter = require('../routes/faculty.route');
const groupRouter = require('../routes/group.route');
const testRouter = require('../routes/test.route');
const resultRouter = require('../routes/result.route');
const assignmentRouter = require('../routes/assignment.route');
const assignmentSubmissionRouter = require('../routes/assignmentSubmission.route');
const HttpException = require('../utils/HttpException.utils');

module.exports = async function(app){
        // parse requests of content-type: application/json
        // parses incoming requests with JSON payloads
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ limit: '50mb', extended: true }));
        // enabling cors for all requests by using cors middleware
        app.use(cors());
        // Enable pre-flight
        app.options("*", cors());
        app.use(express.static(path.join(__dirname, '../../dist')));
        app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
        // i18n.setLocale('uz');
        app.use(cookieParser());
        app.use(i18n.init)

        app.use(`/api/v1/users`, userRouter);
        app.use(`/api/v1/faculties`, facultyRouter);
        app.use(`/api/v1/groups`, groupRouter);
        app.use(`/api/v1/tests`, testRouter);
        app.use(`/api/v1/results`, resultRouter);
        app.use(`/api/v1/assignments`, assignmentRouter);
        app.use(`/api/v1/assignment-submissions`, assignmentSubmissionRouter);
            
        // 404 error
        app.all('*', (req, res, next) => {
            const err = new HttpException(404, req.mf('Endpoint not found'));
            next(err);
        });

        app.use(errorMiddleware);
}
