const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const { defaultAvatar } = require("../config");
const QRcode = require("qrcode");
const { toJSON, paginate } = require("./plugins");

const auth_providers = {
  google: "google",
  local: "local",
  facebook: "facebook",
  twitter: "twitter",
};

var generateUserId = function () {
  var length = 21;
  var characters =
    "ABCGEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  var result = "";
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  this.user_id = result;
};

var generateConfirmationCode = function () {
  var length = 15;
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  var result = "";
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  // await bcrypt.hash(result, 10);
  this.confirmation_code = result;
  return result;
};

const accountStatus = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  BLOCKED: "Blocked",
};

const user_roles = {
  ADMIN: "admin",
  DEFAULt: "default",
  CREATOR: "creator",
};

const userObject = {
  name: {
    last: { type: String, trim: true },
    first: { type: String, trim: true },
  },
  display_name: { type: String, trim: true, maxlength: 24 },
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  avatar: { type: String, default: defaultAvatar },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    immutable: true,
    required: [true, "please provide email address"],
    match: [/\S+@\S+\.\S+/, "is invalid"],
    index: { unique: true, dropDups: true },
  },
  password: { type: String, trim: true, private: true },
  date_of_birth: String,

  bio: { type: String, maxlength: 300 },
  phone: String,
  address: String,
  dob: { type: Date },
  country: String,

  status: {
    type: String,
    enum: ["Pending", "Active", "Suspended", "Blocked"],
    default: accountStatus.PENDING,
  },
  followers: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followersCount: { type: Number, default: 0 },
  following: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followingCount: { type: Number, default: 0 },
  registered_with: {
    type: String,
    default: auth_providers.local,
    enum: Object.values(auth_providers),
  },
  google_id: { type: String },
  facebook_id: { type: String },
  twitter_id: { type: String },
  confirmation_code: { type: String },
  is_creator: { type: Boolean, default: false },
  subscribed_events: [
    {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: false,
    },
  ],
  subscribers: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  ],

  pin: {
    type: String,
    trim: true,
    // private: true, // used by the toJSON plugin
  },
  user_id: String,
  is_subAccount: { type: String, default: false },
  is_verified: { type: Boolean, default: false },
  joined: Date,
  last_login_time: { type: Date },
  events: [
    {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: false,
    },
  ],
  products: [
    {
      type: Schema.Types.ObjectId,
      ref: "Products",
      required: false,
    },
  ],
  bookmarks: {
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Products",
        required: false,
      },
    ],
  },
  youtube: {
    channel: String,
    enabled: { type: Boolean, default: false },
    title: String,
  },
  wallet_id: {
    type: Schema.Types.ObjectId,
    ref: "wallets",
  },
  preferences: [{ type: String }],
  role: { type: String, default: "" },
};
const userSchema = new Schema(userObject, {
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
});

userSchema.virtual("name.full").get(function () {
  return this.name.first + " " + this.name.last;
});

userSchema.index({
  name: "text",
  username: "text",
  display_name: "text",
  bio: "text",
});

userSchema.methods.generateUserId = generateUserId;
userSchema.methods.generateConfirmationCode = generateConfirmationCode;

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.statics.isUsernameTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(
    candidatePassword.toString(),
    this.password
  );
  return isMatch;
};

userSchema.methods.comparePin = async function (candidatePin) {
  const isMatch = await bcrypt.compare(candidatePin.toString(), this.pin);
  return isMatch;
};

userSchema.pre("save", { document: true, query: false }, async function (next) {
  const user = this;
  const saltRounds = 10;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
  if (this.isModified("pin")) {
    user.pin = await bcrypt.hash(user.pin, saltRounds);
  }
  if (this.isModified("following")) {
    this.followingCount = this.following.length;
  }
  if (this.isModified("followers")) {
    this.followersCount = this.followers.length;
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model("User", userSchema);
module.exports = { User, accountStatus, auth_providers };
