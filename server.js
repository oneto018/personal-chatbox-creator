var express = require('express');
var app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

var pgQuery = require('./pgQuery.js');
var chatbox = require('./chatbox.js');

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

//setup  ejs files
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));


server.listen(process.env.PORT || 80);

app.get('/status',function(req,res){
  res.send("simple"+" request!");
});

app.get('/client/:key/:name',function(req,res){
  res.render('client',{name:req.params.name,key:req.params.key});
});

app.get('/client/:key',function(req,res){
  var name = 'chatbox';
  res.render('client',{name:name,key:req.params.key});
});

app.post('/signUp',function(req,res){
  if(req.body.email && req.body.password){
    var result = chatbox.signUp(req.body.email,req.body.password);
    result.then(function(){
      res.end('{"status":true}');
    },function(error){
      res.end('{"status":false,"error":"'+error+'"}');
    });
  } else {
    res.end('{"status":false,"error":"invalid params"}');
  }
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
    var chatboxSocketId = chatbox.getSocketId(data.key);

    io.sockets.socket(chatboxSocketId).emit('chatBox:gotUser', socket.id);
    socket.set('key',data.key,function(){
      socket.set('nickname', data.nick, function () {
        var chatBoxOnline = chatbox.addNormalUser(data.key,socket.id);
        var dataToSend = (chatBoxOnline)? {status:'online'} : {status:'offline'}; 
        socket.emit('normal:joined',dataToSend);
      });
    });
    
  });

//--------- on recieveing msg from normal user -------------------------
  socket.on('client:sendMsg',function(data){
    var socketId = socket.id;
   // var nick = data.nick;
    //var msg = data.msg;
    data.socketId = socketId;
    var key = data.key;
    delete data.key;
    var chatboxSocketId = chatbox.getSocketId(key);
    io.sockets.socket(chatboxSocketId).emit('chatBox:gotMsg', data);
  });

//------------- msg from chatbox to client -------------------------
  socket.on('chatBoxToclient:sendMsg',function(data){
    console.log('chatBoxToclient:sendMsg '+data.msg+' id='+data.id);
    io.sockets.socket(data.id).emit('chatBoxToclient:gotMsg', {msg:data.msg});
  });

//-------- socket disconnect event ---------------------------------
  socket.on('disconnect',function(){
    var dis = chatbox.handleDisconnect(socket);
    dis.then(function(data){
      if(data.type=='client'){
        var key = data.key;
        var chatboxSocketId = chatbox.getSocketId(key);
        io.sockets.socket(chatboxSocketId).emit('chatBox:goneUser', socket.id);
      }
    });
  });




});