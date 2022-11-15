const express = require('express');
const path = require('path')
const morgan = require('morgan');
const cors = require('cors');
const routes = require('./routes');
const httpStatus = require('http-status');
const { errorConverter, errorHandler } = require('./middleware/error');
const {ApiError} = require('./utils/ApiError');
const io = require('./config/io');
const {api} = require('./config');
const app = express();
const server = require('http').createServer(app);
io.init(server);

app.use(morgan('dev'))

app.use(cors({origin: '*'}));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.set('view engine', 'ejs');

// health endpoints
app.get('/status', (req, res) => {
    res.status(200).end();
});
app.head('/status', (req, res) => {
    res.status(200).end();
});

app.get('/docs', (req, res) => {
    res.send(`spray Api running, click <a href='https://documenter.getpostman.com/view/12993294/UV5TGfgL#aaa18ef5-89b6-4640-8760-2dd43ffe84b2'> here for documentation </a> `)
});

app.get('/', (req, res) => {
    res.sendFile(path.join(path.resolve(__dirname, '..'), 'public', 'index.html'));
});

// api routes
app.use(api.prefix, routes)

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found', `route: ${req.url} does not exist, check for typos`));
});

// convert error to ApiError, if needed
app.use(errorConverter);

app.use(errorHandler);

module.exports = server;
