const GroupModel = require('../models/group.model');
const BaseController = require('./BaseController');
const HttpException = require('../utils/HttpException.utils');
const FacultyModel = require('../models/faculty.model');

class GroupController extends BaseController {
    getAll = async (req, res) => {
        const list = await GroupModel.findAll({
            include: [{ model: FacultyModel, attributes: ['id', 'name'] }]
        });
        res.send(list);
    };

    create = async (req, res) => {
        const { name, facultyId } = req.body;
        const group = await GroupModel.create({ name, facultyId });
        res.status(201).send(group);
    };

    update = async (req, res) => {
        const { name, facultyId } = req.body;
        const group = await GroupModel.findByPk(req.params.id);
        if (!group) throw new HttpException(404, 'Group not found');
        group.name = name;
        if (facultyId) group.facultyId = facultyId;
        await group.save();
        res.send(group);
    };

    delete = async (req, res) => {
        const group = await GroupModel.findByPk(req.params.id);
        if (!group) throw new HttpException(404, 'Group not found');
        await group.destroy();
        res.send({ message: 'Group deleted' });
    };
}

module.exports = new GroupController();
