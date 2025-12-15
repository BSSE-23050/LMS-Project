var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'database-lms.cr4y4aq0o0vn.us-east-1.rds.amazonaws.com', // 1. Paste your RDS Endpoint here
  user     : 'admin',                                           // 2. Your RDS Master Username
  password : 'admin1122',                                   // 3. Your RDS Master Password
  database : 'library',                                         // 4. The database name (we will create this in Step 2)
  multipleStatements: true
});

module.exports = {
	executeQuery: function(sql, sqlParam, callback){
		if(sqlParam == null)
		{
			connection.query(sql, function(error, result){
				if(error)
				{
					console.log(error);
				}
				callback(result);
			});
		}
		else
		{
			connection.query(sql, sqlParam, function(error, result){
				if(error)
				{
					console.log(error);
				}
				callback(result);
			});
		}
	}
};
