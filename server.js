'use strict';

var io = require('socket.io')(),
    connect = require('connect'),
    util = require('util'),
    eventEmitter = require('events').EventEmitter,
    writeToFile = require('./writeToFile.js');

// more custom event setup.
// this is the CONSTRUCTOR
var PartnerListener = function () {
    this.wakeUp = function ( partnerSocket ) {
        this.emit('wakeUp', partnerSocket );
    };
};
var app;
if (process.env.NODE_ENV !== 'production') {
    // runs on port 8080 when running locally
    app = connect().use(connect.static('public')).listen(8080);
}
else {
    // runs on port 80 during production
    app = connect().use(connect.static('public')).listen(80);
}

var chat_room = io.listen(app);
var statsocket = io.of('/stats');
var venters = [];
var listeners = [];
var chatting = 0;

util.inherits( PartnerListener, eventEmitter );


chat_room.sockets.on('connection', function (socket) {
    socket.on('identify', function(data) {
        // who are we chatting with
        //to check for the case when the client is in the queue
        socket.chattype = data.chattype;
        socket.chat = "";
        socket.wokenUp = false;
        statsocket.emit('updatechatting', {
            count: chatting
        });
        statsocket.emit('updateventer', {
            count: venters.length
        });
        statsocket.emit('updatelistener', {
            count: listeners.length
        });

        // check the opposite queue. if someone is waiting, match them.
        if ( ( socket.chattype ? listeners : venters ).length > 0 ){
            // get the first partner from the array, assign it, and slice it
            // FIFO FTW
            socket.partnerObject = ( socket.chattype ? listeners : venters ).shift();
            socket.partner = socket.partnerObject.partnerSocket;
            chatting+= 2;
            statsocket.emit('updatechatting', {
                count: chatting
            });
            statsocket.emit('updateventer', {
                count: venters.length
            });
            statsocket.emit('updatelistener', {
                count: listeners.length
            });
            socket.emit('foundpartner', {
                message: "You're now connected to a " + (!socket.chattype ? 'venter' : 'listener') + "."
            });
            // now we can set up actual chat events.
            setUpChatEvents();

            // and let our partner know to set up actual chat events.
            // wakeUp() forces the wakeup event on the listener object
            socket.partnerObject.partnerListener.wakeUp( socket );
        } else {
            socket.wokenUp = false;
            var partnerListener = new PartnerListener();
            // then we add ourselves to the queue, sending a reference to the event listener with it
            ( socket.chattype ? venters : listeners ).push({ 'partnerSocket': socket, 'partnerListener': partnerListener });
            socket.emit('entrance', {
                message: "We're finding you a " + ( !socket.chattype ? 'venter' : 'listener' ) + "."
            });
            if (socket.chattype) {
                statsocket.emit('updateventer', {
                    count: venters.length
                });
            }
            else {
                statsocket.emit('updatelistener', {
                    count: listeners.length
                });
            }
            // if the client is waiting to be paired and decides to disconnect for whatever reason
            socket.on('disconnect', function () {
                // remove the client from the queue
                if(!socket.wokenUp) {
                    if(socket.chattype) {
                        venters = venters.filter(function (el) {
                            return el.partnerSocket.id !== socket.id;
                        });
                        statsocket.emit('updateventer', {
                            count: venters.length
                        });
                    }
                    else {
                        listeners = listeners.filter(function (el) {
                            return el.partnerSocket.id !== socket.id;
                        });
                        statsocket.emit('updatelistener', {
                            count: listeners.length
                        });
                    }
                }
            });

            partnerListener.once('wakeUp', function ( partnerSocket ) {
                socket.partner = partnerSocket;
                socket.emit('foundpartner', {
                    message: "You're now connected to a " + (socket.chattype ? 'listener' : 'venter') + "."
                });
                setUpChatEvents();
            });

        }

        function setUpChatEvents() {
            socket.wokenUp = true;
            socket.on('chat', function (data) {
                socket.partner.emit('chat', {
                    message: data.message
                });
            });

            socket.on('typing', function (data) {
                socket.partner.emit('is typing', {
                    message: data.message
                });
            });

            socket.on('clearedtextfield', function () {
                socket.partner.emit('clearedtextfield');
            });

            socket.on('stoppedtyping', function (data) {
                socket.partner.emit('stopped', {
                    message: data.message
                });
            });

            socket.on('disconnect', function () {
                chatting--;
                statsocket.emit('updatechatting', {
                    count: chatting
                });
                socket.partner.emit('exit', {
                    message: 'Your partner has disconnected.'
                });
            });

            socket.on('log', function (data) {
                writeToFile(data.message, function (filename) {
                    socket.emit('log', {
                        url: filename
                    });
                }, function () {
                    socket.emit('logerror');
                });
            });
        }
    }); 
});
