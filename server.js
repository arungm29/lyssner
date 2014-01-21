var io = require('socket.io'),
  connect = require('connect');

var app = connect().use(connect.static('public')).listen(80);
var chat_room = io.listen(app);

chat_room.sockets.on('connection', function (socket) {
  socket.emit('entrance', {message: 'Connected to a stranger. Start chatting!'});

  socket.on('disconnect', function  () {
    socket.broadcast.emit('exit', {message: 'Stranger has disconnected.'});
  });

  socket.on('chat', function  (data) {
    socket.broadcast.emit('chat', {message: data.message});
  });

  socket.on('typing', function(data){
 socket.broadcast.emit('is typing', {message: data.message});
});

  socket.on('clearedtextfield', function() {
    socket.broadcast.emit('clearedtextfield');
  });

  socket.on('stoppedtyping', function(data){
 socket.broadcast.emit('stopped', {message: data.message});
});
});