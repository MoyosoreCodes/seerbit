const httpStatus = require('http-status');
const {Server} = require('socket.io');
const { ApiError } = require('../utils/ApiError');

let io = null;

// class Room {
//     constructor(io, name) {
//         this.io = io;
//         this.name = name;
//         this.participants = [];
//     }

//     notifyParticipants(room, action) {
//         io.to(room.name).emit(action);
//         for(let participant of this.participants) {
//             // participant.emit(action, room);
//         }
//     }

//     join() {

//     }

//     leave() {

//     }
// }

module.exports = {
    /**
     * * Initialize the socket.io server
     *  @param {Server} server
     */ 
    init: (server) => {
        io = new Server(server, {cors: {origin: '*'}}); 
        io.on('connection', function (socket) {
            console.log(`new socket connection: ${socket.id}`);
            socket.on('disconnect', function() {
                console.log(`${socket.id} disconnected`);
            });
        })
    },
    // Get the socket.io instance
    getInstance: () => io,
    // createRoom: (name) => {
    //     if (!io) throw new ApiError(httpStatus.BAD_REQUEST, "io instance not created");
        
    // },
    
}