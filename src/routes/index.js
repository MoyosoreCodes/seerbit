const express = require('express');
const app = express.Router();

app.use('/auth', require('./api/auth')); //auth
app.use('/users', require('./api/users')); //users
app.use('/account', require('./api/account')); //profile
app.use('/transactions', require('./api/transactions')) //transactions
app.use('/events', require('./api/events')) //events
app.use('/products', require('./api/products')); //products
app.use('/wallets', require('./api/wallets')); //wallets

module.exports = app;