const { User } = require('../models/user.model');
const { Event, event_status, event_type, event_class, participant_roles } = require('../models/event.model');
const {videosdk_api_key, videosdk_api_endpoint, eventURL, 
	hms: {app_access_key, app_secret, api_url, token_options, template_id}
} = require('../config');
// const db = require('../connectDB');
const moment = require('moment');
const _ = require('lodash');
const { Decimal128 } = require('mongoose').Types;
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const {createToken, validateToken} = require('../config/jwt');
const axios = require('axios');
const uuid4 = require('uuid4')

const select_options = ['-passcode'];

const public_event_exclude_fields = '-products -participants -finishTime -currency'

const requestMethods = {
	POST: 'POST',
	GET: 'GET',
}
const videosdk_urls = {
	CREATE: `${videosdk_api_endpoint}/rooms`,
	VALIDATE: roomId => `${videosdk_api_endpoint}/rooms/validate/${roomId}/`,
}

const hms_urls = {
	CREATE_ROOM: `${api_url}/v2/rooms`
}

const videosdk_permissions = ["allow_join", "allow_mod"];

const categories = {
	'0' : 'concert',
	'1' : 'auction',
	'2' : 'marketing',
	'3' : 'podcasts',
	'4' : 'parties',
	'5' : 'charity donations',
	'6' : 'adverts',
	'7' : 'live commerce',
	'8' : 'comedy shows',
	'9' : 'education',
}

module.exports = {

   /**
	 * *creates an event
	 * @param {object} req 
	 */
	createEvent: async (user, params) => {
		const newEvent = new Event(params);
		const {name, description, isPublic, isFree} = params

		if( !isPublic ) await newEvent.generateEventPasscode();
		if( !isFree ) await newEvent.setAccessFee(params.fee);

		newEvent.owner = user.id;

		newEvent.participants.push({ user_id: user.id, role: participant_roles.OWNER });

		newEvent.description = description || name;

		const event_code = newEvent.generateEventCode();

		const event_url = newEvent.setEventUrl(event_code);
		if (!event_url) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Encountered a problem when creating an event')

		await newEvent.generateEventQRCode(event_code);
		return await newEvent.save();
	},

	getAllPublicEvents: async (filter, options) => {
		const events = await Event.paginate(filter, options, select=public_event_exclude_fields);
		return events;
	},

	search: async ({query}) => {
		const events = Event.find({
		    $or: [
		        {   
		        	name: { $regex: query, $options: 'i' },
		        	status : { $in: [event_status.ACTIVE, event_status.PENDING] }
		    	}
		    ]
		}).select('name image url amount status event_code isScheduled is_live access_fee amount').populate('owner.username').exec();
		return events ? events : []
	},

	isUserOwner: async (event_code, userId) => {
		let event = Event.findOne({event_code})
		if (event.owner != userId) return false
		return true
	},

	getEvent: async (query, populate=true) => {
		let event = await Event.findOne(query).select(...select_options).populate([{
			path: 'owner',
			select: 'name username avatar bio wallet_id',
		}, {
			path: 'products'
		}]);
		if(!event) throw new ApiError(httpStatus.NOT_FOUND, `event not found`);
		return event
	},

	showEventDetails: async (query) => {
		const event = Event.findOne(query).select(...select_options)
			.populate(
				[{
					path: 'participants',
					populate: {
						path: 'user_id',
						select: 'username avatar wallet_id',
						model: User
					}
				},
				{
					path: 'owner',
					select: 'name username avatar bio wallet_id',
				}, {
					path: 'products'
				}]
			);
		if(!event) throw new ApiError(httpStatus.NOT_FOUND, 'event not found')
		return event;
	},

	queryEvents: async (query) => {
		let events = await Event.find(query)
		return events
	},

	update: async (event_code, params) => {
		const event = await Event.findOneAndUpdate({event_code}, params, {new: true});
		if (!event) throw new ApiError(httpStatus.BAD_REQUEST, 'event does not exist') 
		return event
	},

	start: async (event_code) => {
		
		let event = await Event.findOne({event_code});
		if (!event) throw new ApiError(httpStatus.BAD_REQUEST, 'event does not exist') 
		if (event.is_live && event.status == event_status.ACTIVE) throw new ApiError(httpStatus.OK, 'event has already started');

		// if(!event.isScheduled) throw new ApiError(httpStatus.BAD_REQUEST, `cannot start event that's not scheduled`)
		if (event.isScheduled && new Date(event.start_date).getTime() > new Date().getTime()) {
			const fomatted_date = moment(event.start_date).format('YYYY-MM-DD');
			throw new ApiError(httpStatus.UNAUTHORIZED, `Cannot launch event till ${fomatted_date}`)
		}
		event.status = event_status.ACTIVE
		event.startTime = Date.now();
		event.is_live = true
		return await event.save()
	},

	end: async (event_code) => {
		let query = {
			'$and' : [
				{'event_code': event_code }, 
				{'status': { '$nin' :  [event_status.CANCELLED, event_status.COMPLETED] } }
			]
		}
		const event = await Event.findOne(query);
		event.status = event_status.COMPLETED
		event.finishTime = Date.now();
		event.is_live = false
		return await event.save()
	},

	delete: async (query) => {
		return await Event.findOneAndRemove(query);
	},

	join: async (event, user_id, passcode = '') => {
		const {_id, participants, type} = event;
		// always asks for passcode when user joins
		if (type == event_type['PRIVATE']) {
			if (!passcode) throw new ApiError(httpStatus.BAD_REQUEST, 'passcode not provided')
			if (!(await event.verifyPassCode(passcode))) throw new ApiError(httpStatus.BAD_REQUEST, 'invalid passcode')
		}

		let result;
		const user = participants.find((x) => x.user_id.toString() == user_id)
		if (!user) {
			result = await Event.findOneAndUpdate(
				{ _id },
				{ $push: { participants : {user_id, is_active: true} } },
				{ new: true, setDefaultsOnInsert: true}
			)
		} 
		
		if(user && !user.is_active) {
			result = Event.findOneAndUpdate(
				{ _id, "participants.user_id": user_id },
				{ $set: {'participants.$.is_active': true}},
				{ new: true, setDefaultsOnInsert: true }
			)
		}
		await event.save();
		return result;        
	},

	accessPaidEvent: async (event, user_id, session = {}) => {
		const {participants, class:eventClass, access_fee, _id} = event;

		if(eventClass !== event_class.PAID) throw new ApiError(httpStatus.BAD_REQUEST, `invalid request, event is ${eventClass}`)
		const user = participants.find((participant) =>  participant.user_id.toString() === user_id );
		if(!user) throw new ApiError(httpStatus.UNAUTHORIZED, `user is not participating in event`)
		if(user?.has_paid_fee) throw new ApiError(httpStatus.OK, `user has already paid access fee`)
		const updatedEvent = await Event.findOneAndUpdate(
			{_id, 'participants.user_id': user_id, 'participants.has_paid_fee': {'$ne': true}},
			{
				"$set": { 'participants.$.has_paid_fee': true  },
				"$inc": {
					'participants.$.money_spent': +Decimal128.fromString(access_fee.toString()),
					"amount": +Decimal128.fromString(access_fee.toString())
				}
			},
			{session}
		)
		if(!updatedEvent) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `error giving participant access`)
		return updatedEvent;
	},

	cancelMany: async (query) => {
		return Event.deleteMany(query)
	},

	leave: async ({_id, participants}, user_id) => {
		const user = participants.filter((x) => x.user_id.toString() == user_id)
		if (!user) return null
		return Event.findOneAndUpdate(
			{ _id, "participants.user_id": user_id },
			{ $set: {'participants.$': {user_id, is_active: false}}},
			{ new: true, setDefaultsOnInsert: true }
		)
	},

	/**
	 * * gets participant data in an event
	 */
	getParticipantData: async (event_code, participantId) => {

	},

	/**
	 * * creates management token 
	 * * to authenticate REST APIs with HMS.
	 * @param {*} event 
	 * @returns 
	 */
	setRoomToken: async (event) => {
		const result = validateToken(event.room_token, app_secret);
		if (result && result !== httpStatus.UNAUTHORIZED) return event.room_token

		const payload = {
			access_key: app_access_key,
			type: 'management',
			version: 2,
			iat: Math.floor(Date.now() / 1000),
			nbf: Math.floor(Date.now() / 1000)
		}

		event.room_token = createToken(payload, app_secret, token_options);
		await event.save();
		return event;	
	},

	validateRoomToken: (event) => {
		const result = validateToken(event.room_token, app_secret);
		return result && result != httpStatus.UNAUTHORIZED ? true : false
	},
	/**
	 * * creates app token
	 * * to authenticate a peer (participant) while joining a room.
	 * @param {*} event 
	 * @param {string} participantId 
	 * @returns 
	 */
	setParticipantToken: async (event, participantId) => {
		let {participants, room_id} = event;
		const participant = participants?.find( ({user_id}) => user_id.toString() == participantId);
		if(!participant) throw new ApiError(httpStatus.FORBIDDEN, 'error generating participant token', "could not retrieve user in participant list, user is not participating in event")

		const payload = {
			user_id: participantId,
			access_key: app_access_key,
			role: participant.role == participant_roles.OWNER ? 'broadcaster': "viewer",
			type: "app",
			version: 2, 
			room_id
		}

		participant.token = createToken(payload, app_secret, {...token_options, jwtid: uuid4()});
		await event.save();
		return participant;
	},

    setRoomId: async (event) => {
		try{
			const payload = {
				access_key: app_access_key,
				type: 'management',
				version: 2
			}
	
			event.room_token = createToken(payload, app_secret, {...token_options, jwtid: uuid4()});
			console.log({template_id, room_token: event.room_token})
	
			const config = {
				method: requestMethods['POST'],
				url: hms_urls.CREATE_ROOM,
				headers: {
					Authorization: `Bearer ${event.room_token}`, 
					"Content-Type": "application/json"
				},
				data: JSON.stringify({
					name: event.event_code,
					description: event.description,
					template_id: template_id, 
					region: "eu"
				})
			}
			const { status, data } = await axios(config);
			event.room_id = data.id;
			await event.save();
			return event.room_id;
		}catch (error) {
			console.log(error.response.config)
			throw new ApiError(error.response.data.code, error.message, error.response.data.message)
		}
    },

    validateVideoToken: async event => {
        try {
            const config = {
                method: requestMethods['GET'],
                url: videosdk_urls.VALIDATE(event?.room_id),
                headers: {Authorization: event?.room_token}
            }
            const { status, data } = await axios(config);
            return data?.roomId;
        } catch (error) {
            // ! only way to handle invalid token with videosdk
            if(error.response) {
                const {data} = error.response;
                if(data.statusCode == httpStatus.UNAUTHORIZED) {
                    event.room_token = null;
                    return;
                }
            }
        }
    },

	deposit: async (event, participantId, amount, session = {}) => {
		// const event - E
 		const {participants, name, _id, owner} = event;

		const participant = participants?.find(({user_id, has_paid_fee, is_active, role}) => {
			const participantIsActive = user_id.toString() === participantId && is_active
			return event.class === event_class.PAID ? participantIsActive && has_paid_fee && role == participant_roles.PARTICIPANT : participantIsActive;
		});

		if(!participant) throw new ApiError(httpStatus.FORBIDDEN, `unable to retrieve participant`, `cannot deposit to ${owner.username}'s event, try joining event`);
		console.log(`depositing ${amount} to ${owner.username}'s event: ${event.event_code}`)
		const updatedEvent = await Event.findOneAndUpdate(
				{
					_id, name, 'participants.user_id': participantId, 'participants.is_active': { '$ne': false }
				},
				{
					"$inc": {
						'participants.$.money_spent': +Decimal128.fromString(amount.toString()),
						"amount": +Decimal128.fromString(amount.toString())
					}
				}, 
				{session, strict: false}
			);
		if(!updatedEvent) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `unable to deposit to event`)
		return updatedEvent;
	},

	withdraw: async function(ownerId, event_code, session = {}) {
		const query = {
			'event_code': event_code,
			"$and": [
				{ owner: ownerId },
				{ 'participants.0.user_id': ownerId },
				{ 'participants.0.has_withdrawn': { $ne : true } },
				{ 'participants.0.role': participant_roles.OWNER }
			]
		}
		const event = await Event.findOne(query).populate([
			{
				path: 'participants',
				populate: {
					path: 'user_id',
					select: 'username wallet_id',
					model: User
				}
			},
			{
				path: 'owner',
				select: 'username wallet_id',
				model: User
			}
		]);

		if(!event) throw new ApiError(httpStatus.NOT_FOUND, `event does not exist`);

		if(event.amount > 0) {
			const updatedEvent = await Event.findOneAndUpdate(
				{ _id: event._id, 'owner': event.owner.id, 'participants.user_id': event.owner.id},
				{
					"$set": { 
						'participants.$.has_withdrawn': true,
						'participants.$.amount_withdrawn': +(event.amount * 0.05).toFixed(2),
					}
				},
				{session, strict: false}
			)
			if(!updatedEvent) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `unable to complete withdrawal`);
			return updatedEvent;
		}
	}
}