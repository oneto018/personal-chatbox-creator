var _find = require('lodash-node/modern/collections/find');
var _pull = require('lodash-node/modern/arrays/pull');
var bcrypt = require('bcryptjs');
var vow = require('vow');

var dataStore = [
				{email:'test@t.com',pass:'$2a$10$uHsgpKbATpMuJw9wLRY/feR3Xjj9DM2pX2tcPQaMEZmtNoQQVqoba',key:'key1',secret:'trtrtt'},
				{email:'test2@t.com',pass:'$2a$10$uHsgpKbATpMuJw9wLRY/feR3Xjj9DM2pX2tcPQaMEZmtNoQQVqoba',key:'key2',secret:'ggfgffd'}
				];

var memory = {chatboxes:{},sockets:{},users:{}};

var login = function (email,pass,socketId){
	var deferred = vow.defer();
	var user = _find(dataStore,{email:email});
	if(user){
		var hash = user.pass;
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
	var socketId = socket.id;

	if(memory.sockets[socketId]){
		//its a main chatbox user
		var chatboxKey = memory.sockets[socketId];
		socket.broadcast.to(chatboxKey).emit('chatbox:goneOffline');
		removeChatboxUser(socketId);
	} else {
		//its probably a normal user
		socket.get('key',function(err,key){
			if(key){
				removeNormalUser(key,socketId);
			}
		});

	}

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

exports.getSocketId = getSocketId;
exports.chatBoxOnline = chatBoxOnline;
exports.addNormalUser = addNormalUser;
exports.handleDisconnect = handleDisconnect;
exports.getFollowingSocketIds = getFollowingSocketIds;