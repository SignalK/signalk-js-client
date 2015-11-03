var WebSocket = require('ws');
var debug = require('debug')('signalk:client');

var Promise = require('bluebird');
var agent = require('superagent-promise')(require('superagent'), Promise);


function Client(host, port) {
  this.host = host;
  this.port = port;
}

Client.prototype.get = function(path) {
  return agent('GET', 'http://' + this.host + ':' + this.port + path).then(function(result) {
    return result.res.body;
  });
}

Client.prototype.connect = function(options) {
  debug('connect');
  var host = this.host;
  var port = this.port;
  if (options) {
    host = options.host || host;
    port = options.port || port;
  }
  if (host && port) {
    return this.connectDelta(options.host + ":" + options.port, options.onData, options.onConnect, options.onDisconnect, options.onError)
  }
  return discoverAndConnect(options);
}

function discoverAndConnect(options) {
  debug('discoverAndConnect');
  try {
    var mdns = require('mdns');
  } catch(ex) {
    console.log("Discovery requires mdns, please install it with 'npm install mdns' or specify host and port");
    return
  }
  return new Promise(function(resolve, reject) {
    var browser = mdns.createBrowser(mdns.tcp('signalk-ws'));
    browser.on('serviceUp', function(service) {
      debug("Discovered signalk-ws with txtRecord:" + JSON.stringify(service.txtRecord, null, 2));
      //TODO handle multiple discoveries
      resolve(service);
    });
    debug("Starting mdns discovery");
    browser.start();
  }).then(function(service) {
    return connectDelta(service.host + ":" + service.port, options.onData, options.onConnect, options.onDisconnect, options.onError);
  });
}


Client.prototype.connectDelta = function(hostname, callback, onConnect, onDisconnect, onError) {
  debug("Connecting to " + hostname);
  var url = "ws://" + hostname + "/signalk/v1/stream?stream=delta&context=self";
  if (typeof Primus != 'undefined') {
    debug("Using Primus");
    var signalKStream = Primus.connect(url, {
      reconnect: {
        maxDelay: 15000,
        minDelay: 500,
        retries: Infinity
      }
    });
    signalKStream.on('data', callback);
    return {
      disconnect: function() {
        signalKStream.destroy();
        debug('Disconnected');
      }
    }
  } else {
    debug("Using ws");
    var connection = new WebSocket(url);
    connection.onopen = function(msg) {
      debug("open");
      if (onConnect) {
        onConnect(connection)
      } else {
        var sub = '{"context":"vessels.self","subscribe":[{"path":"*"}]}';
        connection.send(sub);
      }
    };
    connection.onerror = function(error) {
      debug("error:" + error);
      if (onError) {
        onError(error)
      }
    };
    connection.onmessage = function(msg) {
      callback(JSON.parse(msg.data));
    };
    return {
      disconnect: function() {
        connection.close();
        debug('Disconnected');
      }
    }
  }
}

function getSelf(host) {
  return agent('GET', "http://" + (host || this.host + ":" + this.port) + "/signalk/v1/api/vessels/self");
}

Client.prototype.getSelfMatcher = function(host) {
  return getSelf(host || this.host + ":" + this.port).then(function(result) {
    var selfData = result.body;
    var selfId = selfData.mmsi || selfData.uuid;
    if (selfId) {
      var selfContext = 'vessels.' + selfId;
      return function(delta) {
        return delta.context === 'self' || delta.context === 'vessels.self' || delta.context === selfContext;
      }
    } else {
      return function(delta) {
        return true;
      }
    }
  });
}  





module.exports = {
  Client: Client
}