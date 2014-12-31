var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var openConnections = [];

app.get('/sse', function(req, res){
	req.socket.setTimeout(Infinity);
	res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
	res.write('\n');
	
	console.log('Channel "'+ req.param("channel") +'" opened from '+req.ip)
	
	openConnections.push(res);
	
	// When the request is closed, e.g. the browser window
    // is closed. We search through the open connections
    // array and remove this connection.
    req.on("close", function() {
        var toRemove;
        for (var j =0 ; j < openConnections.length ; j++) {
            if (openConnections[j] == res) {
                toRemove =j;
                break;
            }
        }
        openConnections.splice(j,1);
        console.log(openConnections.length);
    });
});

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(9876, function(){
  console.log('listening on *:9876');
});