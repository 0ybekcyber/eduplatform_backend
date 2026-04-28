const Joi = require('joi');
const Role = require('../../utils/userRoles.utils');

exports.userSchemas = {
  create: Joi.object({
    firstname: Joi.string().required().min(2).max(30),
    lastname: Joi.string().required().min(2).max(30),
    email: Joi.string().email().required().max(50),
    role: Joi.string().valid(Role.Admin, Role.Teacher, Role.Student).required(),
    password: Joi.string().min(3).required().label('Password'),
    phone: Joi.string().allow('', null).max(20),
    facultyId: Joi.number().integer().allow(null),
    groupId: Joi.number().integer().allow(null),
    image: Joi.string().allow('', null),
  }),

  update: Joi.object({
    firstname: Joi.string().required().min(2).max(30),
    lastname: Joi.string().required().min(2).max(30),
    email: Joi.string().email().required().max(50),
    role: Joi.string().valid(Role.Admin, Role.Teacher, Role.Student).required(),
    password: Joi.string().min(3).label('Password').empty(''),
    phone: Joi.string().allow('', null).max(20),
    facultyId: Joi.number().integer().allow(null),
    groupId: Joi.number().integer().allow(null),
    image: Joi.string().allow('', null),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};