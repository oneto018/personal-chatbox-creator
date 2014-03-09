var _find = require('lodash-node/modern/collections/find');
var _pull = require('lodash-node/modern/arrays/pull');
var bcrypt = require('bcryptjs');
var vow = require('vow');
var pgQuery = require('./pgQuery.js');
var rotate = require("rotate");



var memory = {chatboxes:{},sockets:{},users:{}};



var login = function (email,pass,socketId){
	var deferred = vow.defer();
	var q = pgQuery.query('select name,email,key,password as pass from chatbox_users where email = $1',[email]);
	q.then(function(result){
		if(result.rows.length>0){
			var user = result.rows[0];
			var hash = user.pass;
			var userKey = user.key;

			bcrypt.compare(pass, hash, function(err, res) {
	    		// res == true
	    		if(res){
	    			memory.chatboxes[user.key] = socketId ;
					memory.sockets[socketId] = user.key;
					deferred.resolve({key:user.key,socketId:socketId});
	    		}
			});
		} else {
			deferred.reject();
		}
	},function(){
		deferred.reject();
	});
	//var user = _find(dataStore,{email:email});
	return deferred.promise();
};

var checkEmailAvailable = function(email){
	var deferred = vow.defer();
	pgQuery.query('select email from chatbox_users where email = $1',[email])
			.then(function(result){
				if(result.rows.length >0){
					deferred.reject();
				} else {
					deferred.resolve();
				}
			},function(){
				deferred.reject();
			});
	return deferred.promise();
};

var signUp = function(email,password){
	var deferred = vow.defer();
	checkEmailAvailable(email)
	.then(function(){

	},function(){

	});
	if(email && password){
	 checkEmailAvailable(email)
		.then(function(){
			var key = new Buffer(email).toString('base64');
			bcrypt.genSalt(10, function(err, salt) {
			    bcrypt.hash(password, salt, function(err, hash) {
			        // Store hash in your password DB.
			        if(hash){
				        var q = pgQuery.query('INSERT INTO chatbox_users (email,key,password) VALUES ($1,$2,$3)',[email,key,password]);
						q.then(function(){
							deferred.resolve();
						},function(err){
							deferred.reject('error creating user: '+err);
						});
			        } else {
			        	deferred.reject('error in generating your password');
			        }
			    });
			});
		},function(){
			deferred.reject('email already present');
		});
		
	} else {
		deferred.reject('email or password can\'t be empty');
	}

	return deferred.promise();
	
};


var addNormalUser = function(key,socketId){
	if(!memory.users[key]){
		memory.users[key] = [];
	}
	memory.users[key].push(socketId);

	if(memory.chatboxes[key]){
		return memory.chatboxes[key];
	} else {
		return false;
	}
};

var removeNormalUser = function(key,socketId){
	if(memory.users[key]){
		_pull(memory.users[key],socketId);
		if(!(memory.users[key].length>0)){
			delete memory.users[key];
		}
	}
};

var removeChatboxUser = function(socketId){
	
		var userKey = memory.sockets[socketId];
		delete memory.sockets[socketId];
		delete memory.chatboxes[userKey];
};

var handleDisconnect = function(socket){
	var deferred = vow.defer();
	var socketId = socket.id;

	if(memory.sockets[socketId]){
		//its a main chatbox user
		var chatboxKey = memory.sockets[socketId];
		socket.broadcast.to(chatboxKey).emit('chatbox:goneOffline');
		removeChatboxUser(socketId);
		deferred.resolve({type:'chatbox'});
	} else {
		//its probably a normal user
		socket.get('key',function(err,key){
			if(key){
				removeNormalUser(key,socketId);
				deferred.resolve({type:'client',key:key});
			}
		});

	}

	return deferred.promise();

};

var getSocketId = function(key){
	return memory.chatboxes[key];
};

var getFollowingSocketIds = function(key){
	return memory.users[key];
};

var chatBoxOnline = function(key){
	return memory.chatboxes.hasOwnProperty(key);
};

exports.login = login;
exports.signUp = signUp;
exports.getSocketId = getSocketId;
exports.chatBoxOnline = chatBoxOnline;
exports.addNormalUser = addNormalUser;
exports.handleDisconnect = handleDisconnect;
exports.getFollowingSocketIds = getFollowingSocketIds;