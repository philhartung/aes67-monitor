var dgram = require('dgram');
var crypto = require('crypto');

//Session UDP Stuff
var socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
var sessions = {};

socket.bind(9875);
socket.on('listening', function() {
	socket.addMembership('239.255.255.255');
});

socket.on('message', function(message, rinfo) {
	var sdpRaw = message.toString('ascii', 24);
	var sdpParams = sdpRaw.split('\r\n');
	var session = {'lastSeen': Date.now(), 'attr': [],'media': [], 'sdpRaw': sdpRaw};
	var mediaIndex = -1;

	for(var i = 0; i < sdpParams.length; i++){
		var type = sdpParams[i].substring(0, 1);
		var value = sdpParams[i].substring(2);

		if(mediaIndex == -1){
			switch(type){
				case 'o':
					var values = value.split(' ');
					session['id'] = crypto.createHash('md5').update(value).digest('hex');
					if(values.length == 6){
						session['origin'] = {
							'username': values[0],
							'sess-id': values[1],
							'sess-version': values[2],
							'nettype': values[3],
							'addrtype': values[4],
							'unicast-address': values[5]
						};
					}
				break;
				case 'v':
					session['version'] = value;
				break;
				case 's':
					session['name'] = value;
				break;
				case 'i':
					session['sess-info'] = value;
				break;
				case 'c':
					var values = value.split(' ');
					if(values.length == 3){
						session['connection'] = {
							'nettype': values[0],
							'addrtype': values[1],
							'address': values[2]
						};
					}
				break;
				case 't':
					var values = value.split(' ');
					if(values.length == 2){
						session['time'] = {
							'start': values[0],
							'end': values[1]
						};
					}
				break;
				case 'a':
					var index = value.indexOf(':');
					if(index == -1){
						session['attr'].push({'attr': value});
					}else{
						var attr = value.substring(0, index);
						var param = value.substring(index + 1);
						//session['attr'].push({'attr': attr, 'param': param});
						session[attr] = param;
					}
				break;
				case 'm':
					mediaIndex++;
					var values = value.split(' ');
					if(values.length == 4){
						session['media'][mediaIndex] = {
							'type': values[0],
							'port': values[1],
							'proto': values[2],
							'fmt': values[3],
							'attr': []
						}
					}
				break;
			}
		}else{
			switch(type){
				case 'm':
					mediaIndex++;
					var values = value.split(' ');
					if(values.length == 4){
						session['media'][mediaIndex] = {
							'type': values[0],
							'port': values[1],
							'proto': values[2],
							'fmt': values[3],
							'attr': []
						}
					}
				break;
				case 'a':
					var index = value.indexOf(':');
					if(index == -1){
						session['media'][mediaIndex]['attr'].push({'attr': value});
					}else{
						var attr = value.substring(0, index);
						var param = value.substring(index + 1);
						//session['media'][mediaIndex]['attr'].push({'attr': attr, 'param': param});
						session['media'][mediaIndex][attr] = param;
					}
				break;
				case 'c':
					var values = value.split(' ');
					if(values.length == 3){
						session['media'][mediaIndex]['connection'] = {
							'nettype': values[0],
							'addrtype': values[1],
							'address': values[2]
						};
					}
				break;
			}
		}

	}

	if(sessions[session['id']]){
		session['interval'] =  session['lastSeen'] - sessions[session['id']]['lastSeen'];
	}

	sessions[session['id']] = session;
});

exports.getSessions = function(){
	return Object.keys(sessions).map(function (key) { return sessions[key]; });
}

setInterval(function(){
	var keys = Object.keys(sessions);

	for(var i = 0; i < keys.length; i++){
		var diff = Date.now() - sessions[keys[i]].lastSeen;
		
		if(diff > 5 * 60 * 1000){
			delete sessions[keys[i]];
		}
	}
}, 60000);

exports.setNetworkInterface = function(address){
	//set network interface to other interface
	//unbind mcast from current
	//bind mcast to new interface
}