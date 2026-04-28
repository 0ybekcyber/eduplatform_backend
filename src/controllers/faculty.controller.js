const FacultyModel = require('../models/faculty.model');
const BaseController = require('./BaseController');
const HttpException = require('../utils/HttpException.utils');

class FacultyController extends BaseController {
    getAll = async (req, res) => {
        const list = await FacultyModel.findAll();
        res.send(list);
    };

    create = async (req, res) => {
        const { name } = req.body;
        const faculty = await FacultyModel.create({ name });
        res.status(201).send(faculty);
    };

    update = async (req, res) => {
        const { name } = req.body;
        const faculty = await FacultyModel.findByPk(req.params.id);
        if (!faculty) throw new HttpException(404, 'Faculty not found');
        faculty.name = name;
        await faculty.save();
        res.send(faculty);
    };

    delete = async (req, res) => {
        const faculty = await FacultyModel.findByPk(req.params.id);
        if (!faculty) throw new HttpException(404, 'Faculty not found');
        await faculty.destroy();
        res.send({ message: 'Faculty deleted' });
    };
}

module.exports = new FacultyController();
