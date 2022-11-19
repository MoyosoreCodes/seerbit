const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const eventController = require('../../controller/event.controller');
const pin = require('../../middleware/pin');

router
    .route('/')
    .get(eventController.getAllEvents)
    .post(auth(), eventController.createEvent)

router
    .route('/:event_code')
    .get(eventController.viewEvent)
    .post(auth(), eventController.update)
    .delete(auth(), eventController.delete);

router.post('/:event_code/start', auth(), eventController.start)
router.post('/:event_code/end', auth(), eventController.end)

router.post('/:event_id/subscribe', auth(), eventController.subscribe)

router.get('/:event_code/room', auth(), eventController.joinLiveStream);

router.post('/:event_code/members', auth(), eventController.updateParticipants);
router.post('/:event_code/spray', auth(), eventController.spray);

module.exports = router