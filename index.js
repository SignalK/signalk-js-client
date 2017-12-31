/* global Primus */
var _object = require('lodash/object'),
  EventEmitter = require('eventemitter3'),
  debug = require('debug')('signalk:client'),
  url = require('url'),
  Promise = require('bluebird'),
  agent = require('superagent-promise')(require('superagent'), Promise);

var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var NodeWebSocket;
if (typeof window === 'undefined') {
  try {
    NodeWebSocket = require('ws');
  } catch (e) {} // empty
}

var WebSocket = BrowserWebSocket;
if (!WebSocket && typeof window === 'undefined') {
  WebSocket = NodeWebSocket;
}

/**
 * @summary Create a new Signal K Client
 *
 * The constructor takes three optional parameters: hostname, port, and a flag indicating whether or not to use SSL. If
 * no parameters are passed, {@linkcode Client#connect} will attempt to discover a Signal K server on the network via
 * mDNS. Naturally, this doesn't work in the browser.
 * It inherits from EventEmitter, so EventEmitter conventions apply.
 *
 * @param {string} hostname Host to connect to, e.g. localhost
 * @param {number} port Pass undefined to use standard ports: 80/443
 * @param {boolean} useSSL Does what it says on the tin
 *
 * @class
 * This library makes it a little easier to interface with Signal K servers via the REST API and WebSockets. To use it,
 * create a new Client object.
 *
 * @example
 * var client = new Client('localhost');
 * client.connect();
 *
 */
function Client(hostname, port, useSSL) {
  EventEmitter.call(this);

  this.hostname = hostname;

  if (useSSL) {
    this.protocol = 'https';
    this.wsProtocol = 'wss';
    this.port = port || 443;
  } else {
    this.protocol = 'http';
    this.wsProtocol = 'ws';
    this.port = port || 80;
  }
}

require('util').inherits(Client, EventEmitter);

/**
 * @param {Object} options
 * @param {string} options.hostname Deprecated
 * @param {number} options.port Use 80 unless you have a reason not to
 * @param {function} options.onData
 * @param {function} options.onConnect
 * @param {function} options.onDisconnect
 * @param {function} options.onError
 * @param {function} options.onClose
 * @param {string} options.subscribe
 *
 * @returns Calls {@linkcode Client#connectDelta} or {@linkcode Client#discoverAndConnect} and returns the result of
 * that function
 */
Client.prototype.connect = function(options) {
  debug('connect');

  var hostname = this.hostname;
  var port = this.port;

  if (options) {
    hostname = options.hostname || hostname;
    port = options.port || port;
  }

  if (hostname && port) {
    return this.connectDelta(
      hostname + ':' + port,
      options.onData,
      options.onConnect,
      options.onDisconnect,
      options.onError,
      options.onClose,
      options.subscribe
    );
  }

  return this.discoverAndConnect(options);
};

/**
 * @returns a Promise
 */
Client.prototype.connectP = function(options) {
  console.log(options);
  debug('connect');
  debug(options);

  var hostname = this.hostname;
  var port = this.port;

  if (options) {
    hostname = options.hostname || hostname;
    port = options.port || port;
  }

  return new Promise(function(resolve, reject) {
    var connectDeltaByUrl = this.connectDeltaByUrl.bind(this);
    this.get('/signalk', hostname, port)
      .then(function(response) {
        debug('Got ' + JSON.stringify(response.body.endpoints, null, 2));
        var onConnect = function(connection) {
          if (options.onConnect) {
            options.onConnect(connection);
          }
          resolve(connection);
        };
        var onError = function(error) {
          if (options.onError) {
            options.onError(error);
          }
          reject(error);
        };
        connectDeltaByUrl(
          response.body.endpoints.v1['signalk-ws'],
          options.onData,
          onConnect,
          options.onDisconnect,
          onError,
          options.onClose,
          options.subscribe
        );
      })
      .catch(function(error) {
        reject(error);
      });
  });
};

Client.prototype.apiGet = function(path) {
  return this.get('/signalk/v1/api' + path);
};

Client.prototype.get = function(path, hostname, port) {
  var apiUrl = {
    protocol: this.protocol,
    hostname: hostname || this.hostname,
    port: port || this.port,
    pathname: path
  };

  return agent('GET', url.format(apiUrl));
};

Client.prototype.discoveryAvailable = function() {
  return moduleAvailable('md' + 'ns');
};

Client.prototype.startDiscovery = function() {
  var that = this;
  return new Promise(function(resolve, reject) {
    if (!that.discoveryAvailable()) {
      console.log(
        "Discovery requires mdns, please install it with 'npm install mdns' " + 'or specify hostname and port'
      );
      reject('Discovery requires mdns');
    }

    //use dynamic require & maybe fool packagers
    var mdns = require('md' + 'ns');

    that.browser = mdns.createBrowser(mdns.tcp('signalk-http'), {
      resolverSequence: [mdns.rst.DNSServiceResolve()],
    });
    that.browser.on('serviceUp', function(service) {
      debug('Discovered signalk-http:' + JSON.stringify(service, null, 2));
      debug('GETting /signalk');
      that.get('/signalk', service.host, service.port).then(function(response) {
        debug('Got ' + JSON.stringify(response.body.endpoints, null, 2));
        var discovery = {
          host: service.host,
          port: service.port,
          httpResponse: response.body,
          service: service,
        };
        that.emit('discovery', discovery);
        resolve(discovery); // only the first time will matter
      });
    });
    debug('Starting discovery');
    that.browser.start();
  });
};

/**
 * Stops mDNS discovery. Called by {@codelink discoverAndConnect} after it has found an mDNS endpoint.
 */
Client.prototype.stopDiscovery = function() {
  debug('Stopping discovery');
  if (this.browser) {
    this.browser.stop();
    debug('Discovery stopping');
  }
};

/**
 * @returns A Promise
 */
Client.prototype.discoverAndConnect = function(options) {
  debug('discoverAndConnect');
  var that = this;

  return this.startDiscovery().then(function(discovery) {
    var httpResponse = discovery.httpResponse;
    that.endpoints = httpResponse.endpoints;
    debug('Connecting to ' + JSON.stringify(_object.values(that.endpoints)[0]['signalk-ws'], null, 2));
    that.stopDiscovery();
    return that.connectDeltaByUrl(
      _object.values(that.endpoints)[0]['signalk-ws'],
      options.onData,
      options.onConnect,
      options.onDisconnect,
      options.onError,
      options.onClose
    );
  });
};

/**
 * Wrapper for {@linkcode Client#connectDeltaByUrl}
 *
 * The hostname parameter here is not related to the hostname that may have been passed to the constructor. However,
 * the constructor's useSSL parameter determines whether or not to use SSL here.
 *
 * @param {string} hostname - The host to connect to, may include the port
 * @param {messageCb} callback - Called whenever a new delta message arrives
 * @param {connetCb} onConnect - Called when the WebSocket connection is established
 * @param {function} onDisconnect - Not implemented
 * @param {function} onError - Called if the WebSocket connection raises an error
 * @param {function} onClose - Called when the WebSocket connection is closed
 * @param {string} [subscribe] - Optional path to subscribe to
 * @returns result of {@linkcode Client#connectDeltaByUrl}
 */
Client.prototype.connectDelta = function(hostname, callback, onConnect, onDisconnect, onError, onClose, subscribe) {
  var wsUrl = {
    protocol: this.wsProtocol,
    slashes: true,
    hostname: hostname.split(':')[0],
    port: hostname.split(':')[1],
    pathname: '/signalk/v1/stream'
  };

  if(subscribe) {
    wsUrl.query = {'subscribe': subscribe};
  }

  return this.connectDeltaByUrl(url.format(wsUrl), callback, onConnect, onDisconnect, onError, onClose);
};

/**
 *
 * If the application includes the Primus library, connectDeltaByUrl will use it and Primus will handle reconnecting to
 * the server automatically. If the client application does not include Primus, then this will fall back to using the
 * native WebSockets interface and the client application is responsible for restarting the connection if it is lost.
 *
 * @param {string} wsUrl - WebSocket url to connect to, e.g. ws://localhost/signalk/v1/stream
 * @param {messageCb} callback - Called whenever a new delta message arrives
 * @param {connectCb} onConnect - Called when the WebSocket connection is established
 * @param {function} onDisconnect - Not implemented
 * @param {function} onError - Called if the WebSocket connection raises an error
 * @param {function} onClose - Called when the WebSocket connection is closed
 * @param {string} [subscribe] - Optional path to subscribe to
 */
Client.prototype.connectDeltaByUrl = function(wsUrl, callback, onConnect, onDisconnect, onError, onClose) {
  var theUrl = url.parse(wsUrl);
  this.hostname = theUrl.hostname;
  this.port = theUrl.port;
  var sub = {
    context: 'vessels.self',
    subscribe: [
      {
        path: '*',
      },
    ],
  };
  debug('Connecting ws to ' + theUrl.href);
  var skConnection = {
    hostname: this.hostname,
  };

  if (typeof Primus != 'undefined') {
    debug('Using Primus');
    var primus = Primus.connect(wsUrl, {
      reconnect: {
        maxDelay: 15000,
        minDelay: 500,
        retries: Infinity,
      },
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
    debug('Using ws');
    var connection = new WebSocket(wsUrl);
    skConnection.send = function(data) {
      connection.send(typeof data != 'string' ? JSON.stringify(data) : data);
    };
    skConnection.disconnect = function() {
      connection.close();
      debug('Disconnected');
    };
    connection.onopen = function() {
      debug('open');
      if (onConnect) {
        onConnect(skConnection);
      } else {
        skConnection.send(sub);
      }
    };
    connection.onerror = function(error) {
      debug('error:' + error);
      if (onError) {
        onError(error);
      }
    };
    connection.onmessage = function(msg) {
      try {
        callback(JSON.parse(msg.data));
      } catch (e) {
        console.error(e);
      }
    };
    connection.onclose = function(event) {
      debug('close:' + event);
      if (onClose) {
        onClose(event);
      }
    };
  }
  skConnection.subscribeAll = function() {
    skConnection.send(sub);
  };
  return skConnection;
};

/**
 * getSelf
 *
 * Returns the current contents of the Signal K tree for your vessel (or at least the contents of the Signal K tree
 * pointed to by self).
 *
 * @returns {Promise}
 */
Client.prototype.getSelf = function() {
  var skUrl = {
    protocol: this.protocol,
    hostname: this.hostname,
    port: this.port,
    pathname: '/signalk/v1/api/vessels/self',
  };

  return agent('GET', url.format(skUrl));
};

/**
 * getSelfId
 *
 * Returns the self identity
 *
 * @returns {Promise}
 */
Client.prototype.getSelfId = function() {
  var skUrl = {
    protocol: this.protocol,
    hostname: this.hostname,
    port: this.port,
    pathname: '/signalk/v1/api/self'
  };

  return agent('GET', url.format(skUrl));
}

/**
 *
 * getSelfMatcher
 *
 * @returns {function} A function that can be passed to a filter function to select delta messages just for your vessel.
 */
Client.prototype.getSelfMatcher = function() {
  return this.getSelfId().then(function(selfContext) {
    if (selfContext) {
      return function(delta) {
        return delta.context === 'self' || delta.context === 'vessels.self' || delta.context === selfContext;
      };
    } else {
      return function() {
        return true;
      };
    }
  });
};

/**
 * Fetch meta data from the server for a Signal K path specified by prefix and path.
 *
 * @param {string} prefix
 * @param {string} path - Path to get metadata for
 * @returns A Signal K metadata object
 *
 * @example
 * var metadata = client.getMeta('self', 'navigation.speedOverGround');
 */
Client.prototype.getMeta = function(prefix, path) {
  return this.get(prefix + '/' + path.split('.').join('/') + '/meta');
};

function isDelta(msg) {
  return typeof msg.context != 'undefined';
}

function isHello(msg) {
  return typeof msg.version != 'undefined';
}

function moduleAvailable(name) {
  try {
    require.resolve(name);
    return true;
  } catch (e) {}
  return false;
}

module.exports = {
  Client: Client,
  isDelta: isDelta,
  isHello: isHello,
};

/**
 * @callback messageCb
 * @param {Object} msg - Signal K Delta
 */

/**
 * @callback connectCb
 * @param {Object} skConnection
 * @param {string} skConnection.hostname - hostname of the currently connected server
 * @param {function} skConnection.send - a function taking a single parameter, use to send data to the server
 * @param {string} skConnection.disconnect - call to close the connection to the Signal K server
 */
