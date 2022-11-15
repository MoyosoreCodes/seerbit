const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./config/logger');
const {dbURI, port} = require('./config');
// URL
const connectdb = async () => {
    const connection = await mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    });
    return connection.connection.db
};

connectdb()
logger.info('Connected to MongoDB');

server = app.listen(port, () => {
    logger.info(`Listening to port ${port}`);
});
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  } 
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
