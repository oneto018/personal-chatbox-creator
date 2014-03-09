var App = angular.module('chatBoxMaster',['socket-io','ngRoute']);
App.directive('nnScrollToBottom',function(){
  return {
    restrict:'A',
    scope:{
      watchVar:'='
    },
    link:function(scope,element,attrs){
      element[0].scrollTop = element[0].scrollHeight;
      //console.log('scr='+element[0].scrollTop);

      scope.$watch('watchVar.length',function(){
        //console.log('scr='+element[0].scrollTop);
        element[0].scrollTop = element[0].scrollHeight;
      });

    }
  };
});

App.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

App.config(function($routeProvider, $locationProvider) {
    
    $routeProvider.when('/login', {
      templateUrl: 'partials/login.html',
      controller: LoginCtl
    });


 	$routeProvider.when('/main', {
      templateUrl: 'partials/main.html',
      controller: MainCtl
    });

  $routeProvider.otherwise({redirectTo: '/login'});
    
    $locationProvider.html5Mode(false);
  });
 

App.factory('Api',function($http,socket,storage,$window){
  return {
    key:false,
    setKey:function(key){
      this.key = key;
    },
    getKey: function(){
      return this.key;
    },
    login:function(email,password){
      var user = {email:email,password:password};
     
        this.saveUserData(user);
      
      socket.emit('chatbox:register',user);
    },
    saveUserData:function(user){
      storage.set('user',JSON.stringify(user));
    },
    retrieveUser:function(){
      var userStr = storage.get('user');
      if(userStr){
        var user = JSON.parse(userStr);
        return user;
      } else {
        return false;
      }
    },

    signUp:function(email,password){
      var host = $window.location.host;
      var base = 'http://'+host+'/';
      return $http.post(base+'signUp',{email:email,password:password});
    }

  };
});


App.factory('storage',function(){
  return {
    supported:function(){
      var mod = 'modernizr';
      try {
          localStorage.setItem(mod, mod);
          localStorage.removeItem(mod);
          return true;
      } catch(e) {
          return false;
      }
    },
    set:function(key,value){
      try {
        localStorage.setItem(key,value);
        return true;
      } catch (e){
        return false;
      }
      
    },

    get:function(key){
      try {
        return localStorage.getItem(key);
      } catch (e){
        return false;
      }
    },

    remove: function(key){
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e){
        return false;
      }
    }

  };
});


App.run(function($rootScope,socket,$location,Api,storage){
  $rootScope.connected = false ;
  $rootScope.connectMsg = 'not connected';

	socket.on('connection:finished',function(){
    $rootScope.connected = true;
     $rootScope.connectMsg = 'connected';
  });

  socket.on('disconnect', function () {
    $rootScope.connected = false;
     $rootScope.connectMsg = 'disconnected connected';
  });

  socket.on('reconnecting', function () {
    $rootScope.connectMsg = 'connecting';
  });

  socket.on('chatbox:registered',function(data){
    Api.setKey(data.key);
    $rootScope.Key = data.key;
    $location.path('/main');
  });

  socket.on('reconnect', function () {

    var user = (storage.supported())? Api.retrieveUser() : false;
    if(user){
      Api.login(user.email,user.password);
    } else {
      $location.path('/login');
    }
    
  });

});

function LoginCtl($scope,socket,$location,$timeout,Api){
  $scope.user = {};
  $scope.loginError = false;

  $scope.login = function(){
   Api.login($scope.user.email,$scope.user.password);
    
  };

  

  socket.on('chatbox:registerFailed',function(){
    $scope.loginError = true;

    $timeout(function(){
      $scope.loginError = false;

    },5000);
  }).bindTo($scope);

}

function MainCtl($scope,Api,$location,storage,socket){
  $chatboxName = 'ChatBox';
  $scope.key = Api.getKey();
  if(!$scope.key){
    var user = (storage.supported())? Api.retrieveUser() : false;
    if(user){
      Api.login(user.email,user.password);
    } else {
      $location.path('/login');
    }
    
  }

  //initiating scope variables
  $scope.clients = {};
  $scope.unanswerd = 0;


  //gotUser event handler
  socket.on('chatBox:gotUser',function(socketId){
    $scope.clients[socketId] = {id:socketId,unanswerd:0,messages:[],active:false};
  }).bindTo($scope);

  //goneUser event handler
  socket.on('chatBox:goneUser',function(socketId){
    delete $scope.clients[socketId];
  }).bindTo($scope);

  //gotMsg event handler 
  socket.on('chatBox:gotMsg',function(data){
    var msgObject = {msg:data.msg,from:'other'};
    var socketId = data.socketId;
    var nick = data.nick;
    if(!$scope.clients[socketId]){
      $scope.clients[socketId] = {id:socketId,unanswerd:0,messages:[],active:false};
    }
    $scope.clients[socketId].messages.push(msgObject);
    if(!$scope.clients[socketId].active){
       $scope.clients[socketId].unanswerd++;
    }
    //console.log(data);
    
  }).bindTo($scope);

  $scope.setActive = function(id){
    var activeClients = _.filter($scope.clients, { 'active': true });

    activeClients.map(function(client){
      client.active = false;
    });
    $scope.clients[id].active = true;
     $scope.clients[id].unanswerd = 0;
  };


  $scope.submitMsg = function(id){
    var msg = $scope.clients[id].curMessage;
    var msgObject = {msg:msg,from:'you'};
    socket.emit('chatBoxToclient:sendMsg',{msg:msg,id:id});
    $scope.clients[id].messages.push(msgObject);
    $scope.clients[id].curMessage = '';

  };

}

function signUpCtl ($scope,Api,$timeout){
  $scope.signupAlert = {show:false};
  $scope.signedUpStatus = false;
  $scope.signUp = function(){
    var successMsg = 'successfully registered. Now you can login';
    if($scope.user && $scope.password){
      Api.signUp($scope.user,$scope.password)
        .sucess(function(data){
          $scope.user = {};
          $scope.signedUpStatus = data.status;
          $scope.signupAlert.msg = (data.status)? successMsg: data.error;
          $scope.signupAlert.show = true;
          $timeout(function(){
            $scope.signupAlert.show = false;
          },6000);
        });
        
      
    }
  };
}