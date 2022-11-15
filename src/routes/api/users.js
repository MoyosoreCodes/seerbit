const express = require('express');
const router = express.Router();
const {userController,eventController} = require('../../controller');
const auth = require('../../middleware/auth');
const userService = require('../../services/user.service');
const {userValidator} = require('../../validators')
const validate = require('../../middleware/validator');

//protected
router
    .route('/')
    .get(userController.list)
    .post(validate(userValidator.register), userController.create)
    .delete(auth(), userController.delete)

router
    .route('/:username')
    .get(auth(false), userController.getUserByUsername)
    .post(auth(), userController.update)

router
    .route('/:username/follows')
    .post(auth(), userController.toggleFollow)

router
    .route('/:username/events')
    .get(auth(), eventController.getUserEvents)

router.post('/:username/save', auth(), userController.toggleBookmark)


module.exports = router;

