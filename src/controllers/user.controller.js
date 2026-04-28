const UserModel = require('../models/user.model');
const FacultyModel = require('../models/faculty.model');
const GroupModel = require('../models/group.model');
const HttpException = require('../utils/HttpException.utils');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { secret_jwt } = require('../startup/config');
const BaseController = require('./BaseController');
const { MyUser, MainUser } = require('../utils/userRoles.utils');
const { Op } = require('sequelize');
const moment = require('moment');
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class UserController extends BaseController {
    getAll = async (req, res, next) => {
        let modelList = await UserModel.findAll({
            where: {
                id: { [Op.ne]: MyUser }
            },
            order: [
                ['firstname', 'ASC'],
                ['lastname', 'ASC'],
                ['id', 'ASC']
            ],
            include: [
                { model: FacultyModel, attributes: ['id', 'name'] },
                { model: GroupModel, attributes: ['id', 'name'] }
            ]
        });
        res.send(modelList);
    };

    getById = async (req, res, next) => {
        const user = await UserModel.findOne({
            where: { id: req.params.id }
        });

        if (!user) {
            throw new HttpException(404, req.mf('data not found'));
        }

        res.send(user);
    };

    getByUsername = async (req, res, next) => {
        const user = await UserModel.findOne({ where: { username: req.params.username } });
        if (!user) {
            throw new HttpException(404, req.mf('data not found'));
        }

        res.send(user);
    };

    getCurrentUser = async (req, res, next) => {
        res.send(req.currentUser);
    };

    create = async (req, res, next) => {
        console.log('Create User Request Body:', req.body);
        this.checkValidation(req);

        await this.hashPassword(req);
        let {
            firstname,
            lastname,
            email,
            password,
            role,
            phone,
            facultyId,
            groupId,
            image,
            gender
        } = req.body;

        const model = await UserModel.create({
            firstname,
            lastname,
            email,
            password,
            role,
            phone,
            facultyId,
            groupId,
            image,
            gender
        });

        if (!model) {
            throw new HttpException(500, req.mf('Something went wrong'));
        }

        res.status(201).send(model);
    };

    update = async (req, res, next) => {
        this.checkValidation(req);

        await this.hashPassword(req);
        let {
            firstname,
            lastname,
            email,
            password,
            role,
            phone,
            facultyId,
            groupId,
            image,
            gender
        } = req.body;

        const model = await UserModel.findOne({ where: { id: req.params.id } });

        if (!model) {
            throw new HttpException(404, req.mf('data not found'));
        }

        model.firstname = firstname;
        model.lastname = lastname;
        if (email) model.email = email;
        if (password) model.password = password;
        model.role = role;
        model.phone = phone;
        model.facultyId = facultyId;
        model.groupId = groupId;
        model.image = image;
        model.gender = gender;
        await model.save();

        res.send(model);
    };

    deleteUser = async (req, res, next) => {
        console.log(`[Delete] Request for user ID: ${req.params.id} by admin: ${req.currentUser.id}`);
        const model = await UserModel.findOne({ where: { id: req.params.id } });

        if (!model) {
            console.warn(`[Delete] User with ID ${req.params.id} not found.`);
            throw new HttpException(404, req.mf('data not found'));
        }

        if (model.id === MainUser) {
            console.warn(`[Delete] Attempted to delete protected MainUser ID: ${model.id}`);
            throw new HttpException(400, req.mf('This item cannot be deleted'));
        }

        try {
            console.log(`[Delete] Destroying user ID: ${model.id}...`);
            await model.destroy({ force: true });
            console.log(`[Delete] User ID ${model.id} successfully removed.`);
        } catch (error) {
            console.error(`[Delete] Failed to destroy user: ${error.message}`);
            throw new HttpException(500, req.mf('Something went wrong'));
        }

        res.send(req.mf('data has been deleted'));
    };

    userLogin = async (req, res, next) => {
        this.checkValidation(req);

        const { email, password: pass } = req.body;

        const user = await UserModel.findOne({
            where: {
                email: email
            }
        });

        if (!user) {
            throw new HttpException(401, req.mf('Incorrect login or password!'));
        }

        const isMatch = await bcrypt.compare(pass, user.password);

        if (!isMatch) {
            throw new HttpException(401, req.mf('Incorrect login or password!'));
        }

        // user matched!
        const token = jwt.sign({ user_id: user.id.toString() }, secret_jwt, {
            expiresIn: '240h'
        });

        user.token = token;
        res.send(user);
    };
    checkToken = async (req, res, next) => {
        try {
            const authHeader = req.headers["authorization"];
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new HttpException(401, "No token provided");
            }

            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, secret_jwt);

            res.send({
                valid: true,
                expiresAt: new Date(decoded.exp * 1000),
                user_id: decoded.user_id,
            });
        } catch (err) {
            res.status(401).send({
                valid: false,
                message:
                    err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
            });
        }
    };

    // hash password if it exists
    hashPassword = async (req) => {
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 8);
        }
    }
}



/******************************************************************************
 *                               Export
 ******************************************************************************/
module.exports = new UserController;