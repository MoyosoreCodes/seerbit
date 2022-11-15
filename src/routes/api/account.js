const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {userController, eventController} = require('../../controller');

//get all profiles
router.get('/', auth(), userController.getUserProfile);
router.post('/event/:event_id/cancel', auth(), eventController.cancelMany)

module.exports = router;