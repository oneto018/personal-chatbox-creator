var express = require('express');
var app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

var chatbox = require('./chatbox.js');
//setup  ejs files
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));


server.listen(process.env.PORT || 80);


app.get('/te', function (req, res) {
  res.send(__dirname + '/index.html');
});

app.get('/client/:key/:name',function(req,res){
  res.render('client',{name:req.params.name,key:req.params.key});
});

io.sockets.on('connection', function (socket) {

  //-------- generic socket connection complete event ---------
  socket.emit('connection:finished',socket.id);


  socket.on('my other event', function (data) {
    console.log(data);
  });

//---------registering chatfox for the session-----------------
  socket.on('chatbox:register',function(data){
    console.log('chatbox::registering');
    console.log(data);
  	var login = chatbox.login(data.email,data.password,socket.id);
    login.then(function(data){
      socket.emit('chatbox:registered',data);
      //sending this join event to all connected users in that romm if any
      io.sockets.in(data.key).emit('chatbox:cameOnline');
    },function(){
      socket.emit('chatbox:registerFailed');
    });

  });

//--------normal user registration for particular chatbox----------
  socket.on('normal:join',function(data){
    socket.join(data.key);
    socket.set('key',data.key,function(){
      socket.set('nickname', data.nick, function () {
        var chatBoxOnline = chatbox.addNormalUser(data.key,socket.id);
        var dataToSend = (chatBoxOnline)? {status:'online'} : {status:'offline'}; 
        socket.emit('normal:joined',dataToSend);
      });
    });
    
  });

//-------- socket disconnect event ---------------------------------
  socket.on('disconnect',function(){
    chatbox.handleDisconnect(socket);
  });

});