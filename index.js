var EventEmitter = require('eventemitter3');
var WebSocket = require('ws');
var debug = require('debug')('signalk:client');

var Promise = require('bluebird');
var agent = require('superagent-promise')(require('superagent'), Promise);


function Client(host, port) {
  this.host = host;
  this.port = port;
}


require('util').inherits(Client, EventEmitter);


Client.prototype.get = function(path) {
  return agent('GET', 'http://' + this.host + ':' + this.port + '/signalk/v1/api' + path).then(function(result) {
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
  return this.discoverAndConnect(options);
}

Client.prototype.discoverAndConnect = function(options) {
  debug('discoverAndConnect');
  var that = this;
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
    that.host = service.host;
    that.port = service.port;
    debug("Discovered " + that.host + ":" + that.port)
    that.emit('discovery', service);
    return that.connectDelta(service.host + ":" + service.port, options.onData, options.onConnect, options.onDisconnect, options.onError);
  });
}


Client.prototype.connectDelta = function(hostname, callback, onConnect, onDisconnect, onError) {
  var sub = {
    "context": "vessels.self",
    "subscribe": [{
      "path": "*"
    }]
  };
  debug("Connecting to " + hostname);
  var url = "ws://" + hostname + "/signalk/v1/stream?stream=delta&context=self";
  var skConnection = {};

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
    skConnection.send = signalKStream.write;
    skConnection.disconnect = function() {
      signalKStream.destroy();
      debug('Disconnected');
    };
    if (onConnect) {
      signalKStream.on('connect', onConnect(skConnection));
    } else {
      signalKStream.on('connect', function() { signalKStream.write(sub); });
    }
  } else {
    debug("Using ws");
    var connection = new WebSocket(url);
    skConnection.send = function(data) {
      connection.send(JSON.stringify(data));
    };
    skConnection.disconnect = function() {
      connection.close();
      debug('Disconnected');
    };
    connection.onopen = function(msg) {
      debug("open");
      if (onConnect) {
        onConnect(skConnection)
      } else {
        skConnection.send(sub);
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
  }
  skConnection.subscribeAll = function() {
    skConnection.send(sub);
  }
  return skConnection;
}

Client.prototype.getSelf = function (host) {
  return agent('GET', "http://" + (host || this.host + ":" + this.port) + "/signalk/v1/api/vessels/self");
}

Client.prototype.getSelfMatcher = function(host) {
  return this.getSelf(host || this.host + ":" + this.port).then(function(result) {
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

function convertUpdateToHumanUnits(update) {
  if (update.values) {
    update.values.forEach(convertPathValueToHumanUnits)
  }
}

function convertPathValueToHumanUnits(pathValue) {
  if (signalkSchema.metadata[pathValue.path] && conversions[signalkSchema.metadata[pathValue.path].units]) {
    pathValue.value = conversions[signalkSchema.metadata[pathValue.path].units].convert(pathValue.value);
    pathValue.units = conversions[signalkSchema.metadata[pathValue.path].units].to;
  }
}

function isDelta(msg) {
  return typeof msg.context != "undefined"
}

function isHello(msg) {
  return typeof msg.version != "undefined"
}

module.exports = {
  Client: Client,
  isDelta: isDelta,
  isHello: isHello
}
