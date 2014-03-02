var vow = require('vow');
var pg = require('pg');
//var conString = "postgres://postgres:1234@localhost/postgres";
var conString = process.env.PGSQL_URL;

module.exports = {
   query: function(text, values) {
   	var deferred = vow.defer();
      pg.connect(conString,function(err, client, done) {
        client.query(text, values, function(err, result) {
          done();
          if(result){
          	deferred.resolve(result);
          } else if(err){
          	deferred.reject();
          }
          //cb(err, result);
        })
      });
    return deferred.promise();
   }
};