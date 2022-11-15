const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const QRcode = require('qrcode');
const url = require('../config').client_url;
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');

const event_status = {
    ACTIVE : "ACTIVE", // in progress, does not allow participants only the amount the be sprayed can be changed
    COMPLETED:'COMPLETED', // completed (to be logged), 
    CANCELLED:'CANCELLED', // cancelling, does not allow participants or amount to be changed
    PENDING: "PENDING" // on creation, allows participants at this point
}

const event_type = {
    PUBLIC : 'PUBLIC',
    PRIVATE : 'PRIVATE'
}

const event_class = {
    FREE : 'FREE',
    PAID : 'PAID'
}

const participant_roles = {
    OWNER: 'owner', 
    PARTICIPANT: 'participant'
}

const participantSchema = mongoose.Schema({   
    token: String,
    role: { type:String, default: participant_roles.PARTICIPANT, enum: Object.values(participant_roles) },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    is_active: {type:Boolean, default:true}, // ! owner of event shouldn't have to join again
    has_paid_fee: {type: Boolean},
    has_withdrawn: {type:Boolean},
    amount_withdrawn: {
        immutable: true,
        type: mongoose.Types.Decimal128, 
        get: balance => +parseFloat(balance).toFixed(2)
    },
    money_spent: {
        immutable: true,
        type: mongoose.Types.Decimal128, 
        default: 0,
        get: balance => +parseFloat(balance).toFixed(2)
    }
}, { _id : false });


const eventObject = {
    owner:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name:{type: String, trim:true, minimum: 4},
    qrcode: {type: String, trim:true},
    image: String,
    description: {type:String, trim: true},
    event_code: {type:String, trim:true, index:  {unique: true, dropDups: true}},
    url: {type:String}, 
    tags: [String],
    status: {
        type: String, 
        trim:true,
        default: event_status.PENDING,
        enum: Object.values(event_status)
    },
    start_date: { type: Date, default: Date.now }, 
    isScheduled: { type: Boolean, default: false }, 
    type: { type: String, enum:[...Object.values(event_type)], default: event_type.PUBLIC },
    class: { type: String, enum:[...Object.values(event_class)], default: event_class.FREE },
    category: String,
    passcode: String,
    currency: {type:String, default:'NGN'},
    amount:{ 
        immutable: true,
        type: mongoose.Types.Decimal128, 
        default: 0.00, 
        get: amt => +parseFloat(+amt).toFixed(2),
    },
    access_fee: {
        type: mongoose.Types.Decimal128, 
        get: balance => +parseFloat(balance).toFixed(2)
    },
    startTime: { type: Date },
    finishTime: { type: Date }, 
    participants: [{ type: participantSchema }],
    participantCount: {type:Number},
    room_token : {type:String},
    room_id : {type:String},
    is_live: {type: Boolean, default: false},
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Products',
        required: false
    }],
    subscribers: [{
        type: Schema.Types.ObjectId,
        ref: "Users"
    }]
}

//generates event code
const generateEventCode = function() {
    var length = 6;
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i <= length; i++ ) {
        // if (i == 3) result += "-";
        result += i == 3 ? "-" : characters.charAt(Math.floor(Math.random() * charactersLength));
        // result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    this.event_code = result;
    return result;
}

//set event url from event code
const setEventUrl = function(event_code) {
    if (!event_code) {
        return 0
    }
    // https://symble-app.herokuapp.com/event/
    const event_url = `${url}/event/${event_code}`;
    this.url = event_url;
    return event_url
}

//QRcode generate from event url
const generateEventQRCode = async function(event_code) {
    // console.log('here')
    if(!event_code || event_code == " ") {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "error generating qrcode: event code not provided")
    }
    this.qrcode = await QRcode.toDataURL(event_code);
}

var generateEventPasscode = async function() {
    var length = 6;
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i <= length; i++ ) {
        // if (i == 3) result += "-";
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        // result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    this.passcode = result;
    return result;
}

var verifyPassCode = async function(passcode){
    try {  
      const match = await bcrypt.compare(passcode.toString(), this.passcode);
      if(!match) return false;
  
      return true;
    } catch (err) {
        throw err;
    }
};

var setAccessFee = function(fee) {
    if(!fee || fee < 0) throw new ApiError(httpStatus.BAD_REQUEST, `event fee not provided or is invalid for ${this.class} event`);
    this.access_fee = this.class == event_class.PAID ? fee : null
}

var getParticipantWalletIds = function() {
    return this.participants.map(participant => participant.user_id?.wallet_id)
}

/* Checking if a user is a participant in an event. */
// ! probably not needed
const participantIsActive = function(participantId) {
    return this.participants.find(
        participant => participantId == participant.user_id._id.toString() && participant.is_active
    )
}

const eventSchema = new Schema(eventObject, { timestamps:true, toJSON: { getters: true } });
eventSchema.index({name: 'text', description: 'text'});

eventSchema.methods.setEventUrl = setEventUrl;
eventSchema.methods.generateEventCode = generateEventCode;
eventSchema.methods.generateEventQRCode = generateEventQRCode;
eventSchema.methods.generateEventPasscode = generateEventPasscode;
eventSchema.methods.verifyPassCode = verifyPassCode;
eventSchema.methods.setAccessFee = setAccessFee;
eventSchema.methods.participantIsActive = participantIsActive;
eventSchema.methods.getParticipantWalletIds = getParticipantWalletIds;

eventSchema.plugin(toJSON);
eventSchema.plugin(paginate);

eventSchema.pre('save', async function (next) {
  this.participantCount = this.participants ? this.participants.length : 0;
  next();
});

/**
 * @typedef User
 */
const Event = mongoose.model('Event', eventSchema);
module.exports = { Event, event_status, event_type, event_class, participant_roles }