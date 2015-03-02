var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require("redis");
var nconf = require('nconf');
var bodyParser = require('body-parser')

var openConnections = {};
var redisClients = {};

nconf.argv().env().file({ file: 'settings.json' });
app.use( bodyParser.json() );


app.get('/sse/subscribe', function(req, res){	
	//req.socket.setTimeout(Infinity);
	//req.setTimeout(Infinity);
	//res.setTimeout(Infinity);
	
	res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
	res.write('\n');
	
	res.write("retry: 1 \n\n");
	
	console.log('Channel "'+ req.param("channel") +'" opened from '+req.ip)
	console.log('Webtoken: '+req.param("token"));
	
	if(openConnections[req.param("channel")]===undefined){
		openConnections[req.param("channel")] = [res];
	} else {
		openConnections[req.param("channel")].push(res);
	}
	
    if (redisClients[req.param("channel")]===undefined) { 
    	redisClient = redis.createClient(nconf.get('redis_port'),nconf.get('redis_ip'),{auth_pass: nconf.get('redis_auth')})
		redisClient.subscribe(req.param("channel"));
		redisClient.on("message", function (channel, message) {
	      console.log("Redis Channel " + channel + ": " + message);
	      for(var i=0; i<(openConnections[channel]).length; i++){
	    	  timestamp = new Date();
	    	  openConnections[channel][i].write('id: ' + timestamp.getMilliseconds() + '\n');
	    	  openConnections[channel][i].write('data:' + message +   '\n\n');
	      }
		});
		redisClients[req.param("channel")]=redisClient;
    }
	
	// When the request is closed, e.g. the browser window
    // is closed. We search through the open connections
    // array and remove this connection.
    req.on("close", function() {
        var toRemove;
        for (channel in openConnections) {
            if (channel === req.param('channel')) {
                for(var j=0 ; j< openConnections[channel].length; j++){
                	if(openConnections[channel][j] == res){
                		toRemove=j;
                        break;
                	}
                }
            }
            if(toRemove!=undefined){
            	connections = openConnections[channel];
            	connections.splice(toRemove,1);
            	console.log("Channel '"+channel+"' closed");
            	if(connections.length===0){
                	delete openConnections[channel];
                	redisClients[channel].unsubscribe();
                	redisClients[channel].end();
                	delete redisClients[channel];
                } else {
                	openConnections[channel]=connections;
                }
            	break;
            }
        }
    });
});

app.post('/sse/publish', function(req, res){
	channel = req.param("channel");
	event = req.param('event');		
	if(openConnections[channel]!=undefined){
		for(var i=0; i<openConnections[channel].length; i++){
			timestamp = new Date();
			var str = "";
			if(event!=undefined){
				openConnections[channel][i].write('event: ' +event+"\n");
			}
			openConnections[channel][i].write('id: ' + timestamp.getMilliseconds() + '\n');
			openConnections[channel][i].write('data:' + JSON.stringify(req.body) +   '\n\n');
		}
	}
	res.sendStatus(200);
});

setInterval(function() {
    console.log("Send connection refresh...");
    for(channel in openConnections) {
    	openConnections[channel].forEach(function(resp){
    		timestamp = new Date();
        	resp.write('event: refresh\n')
            resp.write('id: ' + timestamp.getMilliseconds() + '\n');
            resp.write('data: \n\n');
    	});
    }
}, nconf.get('refresh_timeout'));

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(nconf.get('port'), nconf.get('host'), function(){
  console.log('listening on '+nconf.get('host')+':'+nconf.get('port'));
  
  
  
  
});

