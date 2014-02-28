var App = angular.module('chatBoxMaster',['socket-io','ngRoute']);
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
 

App.factory('Api',function($http,socket){
  return {
    setKey:function(key){
      this.key = key;
    },
    getKey: function(){
      return this.key;
    }

  };
});


App.run(function($rootScope,socket){
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

});

function LoginCtl($scope,socket,$location,$timeout,Api){
  $scope.user = {};
  $scope.loginError = false;

  $scope.login = function(){
    socket.emit('chatbox:register',$scope.user);
    
  };

  socket.on('chatbox:registered',function(data){
    Api.setKey(data.key);
    $location.path('/main');
  }).bindTo($scope);

  socket.on('chatbox:registerFailed',function(){
    $scope.loginError = true;

    $timeout(function(){
      $scope.loginError = false;

    },5000);
  }).bindTo($scope);

}

function MainCtl($scope,Api){
  $scope.key = Api.getKey();

}