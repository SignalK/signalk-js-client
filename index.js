var _object = require('lodash/object');
var EventEmitter = require('eventemitter3');
var WebSocket = require('ws');
var debug = require('debug')('signalk:client');
var url = require('url');

var Promise = require('bluebird');
var agent = require('superagent-promise')(require('superagent'), Promise);

//Workaround for Avahi oddity on RPi
//https://github.com/agnat/node_mdns/issues/130
function getSequence(mdns) {
  return [
    mdns.rst.DNSServiceResolve(),
    'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({
      families: [4]
    }),
    mdns.rst.makeAddressesUnique()
  ];
}

function Client(host, port) {
  this.host = host;
  this.port = port;
}


require('util').inherits(Client, EventEmitter);

Client.prototype.apiGet = function(path) {
  return this.get('/signalk/v1/api' + path);
}

Client.prototype.get = function(path, host, port) {
  return agent('GET', 'http://' + (this.host || host) + ':' + (this.port || port) + path);
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

Client.prototype.startDiscovery = function() {
  debug('startDiscovery');
  var that = this;
  try {
    var mdns = require('mdns');
  } catch (ex) {
    console.log("Discovery requires mdns, please install it with 'npm install mdns' or specify host and port");
    return
  }
  that.browser = mdns.createBrowser(mdns.tcp('signalk-http'), {
    resolverSequence: getSequence(mdns)
  });
  that.browser.on('serviceUp', function(service) {
    debug("Discovered signalk-http:" + JSON.stringify(service.type, null, 2) + "\n" + JSON.stringify(service.txtRecord, null, 2));
    debug("GETting /signalk")
    that.get('/signalk', service.host, service.port)
      .then(function(response) {
        debug("Got " + JSON.stringify(response.body.endpoints, null, 2));
        that.emit('discovery', {
          host: service.host,
          port: service.port,
          discoveryResponse: response.body
        });
      })
  });
  debug("Starting mdns discovery");
  that.browser.start();
}

Client.prototype.stopDiscovery = function() {
  if (this.browser) {
    debug('Stopping discovery');
    this.browser.stop();
  }
}

Client.prototype.discoverAndConnect = function(options) {
  debug('discoverAndConnect');
  var that = this;
  try {
    var mdns = require('mdns');
  } catch (ex) {
    console.log("Discovery requires mdns, please install it with 'npm install mdns' or specify host and port");
    return
  }
  return new Promise(function(resolve, reject) {
    var browser = mdns.createBrowser(mdns.tcp('signalk-http'), {
      resolverSequence: getSequence(mdns)
    });
    browser.on('serviceUp', function(service) {
      debug("Discovered signalk-http:" + JSON.stringify(service.type, null, 2) + "\n" + JSON.stringify(service.txtRecord, null, 2));
      debug("Stopping discovery");
      browser.stop();
      that.host = service.host;
      that.port = service.port;
      debug("GETting /signalk")
      that.get('/signalk')
        .then(function(response) {
          debug("Got " + JSON.stringify(response.body.endpoints, null, 2));
          that.endpoints = response.body.endpoints;
          resolve(response.body.endpoints);
        })
    });
    debug("Starting mdns discovery");
    browser.start();
  }).then(function(endpoints) {
    that.endpoints = endpoints;
    that.emit('discovery', endpoints);
    debug("Connecting to " + JSON.stringify(_object.values(endpoints)[0]['signalk-ws'], null, 2));
    return that.connectDeltaByUrl(_object.values(endpoints)[0]['signalk-ws'], options.onData, options.onConnect, options.onDisconnect, options.onError);
  });
}


Client.prototype.connectDelta = function(hostname, callback, onConnect, onDisconnect, onError, subscribe) {
  var url = "ws://" + hostname + "/signalk/v1/stream" + (subscribe ? '?subscribe=' + subscribe : '');
  return this.connectDeltaByUrl(url, callback, onConnect, onDisconnect, onError);
}

Client.prototype.connectDeltaByUrl = function(wsUrl, callback, onConnect, onDisconnect, onError) {
  var theUrl = url.parse(wsUrl);
  this.host = theUrl.hostname;
  this.port = theUrl.port;
  var sub = {
    "context": "vessels.self",
    "subscribe": [{
      "path": "*"
    }]
  };
  debug("Connecting ws to " + wsUrl);
  var skConnection = {
    host: this.host
  };

  if (typeof Primus != 'undefined') {
    debug("Using Primus");
    var primus = Primus.connect(wsUrl, {
      reconnect: {
        maxDelay: 15000,
        minDelay: 500,
        retries: Infinity
      }
    });
    primus.on('data', callback);
    skConnection.send = primus.write.bind(primus);
    skConnection.disconnect = function() {
      primus.end();
      debug('Disconnected');
    };
    if (onConnect) {
      primus.on('open', onConnect.bind(this, skConnection));
    } else {
      primus.on('open', function() {
        skConnection.send(sub);
      });
    }
  } else {
    debug("Using ws");
    var connection = new WebSocket(wsUrl);
    skConnection.send = function(data) {
      connection.send(typeof data != 'string' ? JSON.stringify(data) : data);
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


Client.prototype.getSelf = function(host) {
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

Client.prototype.getMeta = function(prefix, path) {
  return this.get(prefix + "/" + path.split('.').join('/') + '/meta');
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
