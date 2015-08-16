var WebSocket = require('ws');
var debug = require('debug')('signalk:client');
//var browser = require('./ui/util/browser');
var Promise = require('bluebird');
var mdns = require('mdns');

function Client() {

}

Client.prototype.connect = function(options) {
  if (options.host && options.port) {
    return connectDelta(options.host + ":" + options.port, options.onData, options.onConnect, options.onDisconnect, options.onError)
  }
  return discoverAndConnect(options);
}

function discoverAndConnect(options) {
  debug("connect");
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


function connectDelta(hostname, callback, onConnect, onDisconnect, onError) {
  debug("Connecting to " + hostname);
  var url = "ws://" + hostname + "/signalk/stream/v1?stream=delta&context=self";
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
      var sub = '{"context":"vessels.self","subscribe":[{"path":"*"}]}';
      connection.send(sub);
      if (onConnect) onConnect();
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


module.exports = {
  Client: Client
}