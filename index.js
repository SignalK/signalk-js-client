/**
 * @summary Create a new Signal K Client
 *
 * The constructor should take a single object parameter for configuration, with the following properties:
 * @param {object} options — Configuration options object
 * @param {string} options.hostname — Host to connect to, e.g. localhost
 * @param {number} options.port — Override the standard ports of 80/443
 * @param {Boolean} options.useTLS — flag to indicate whether or not the client should use TLS
 * @param {string} options.version — string indicating the version of the Signal K API the client should use, defaults
 *   to v1
 * @param {function} options.onClose — callback called when the connection is closed, takes two parameters: number and
 *   string
 * @param {function} options.onError — callback called when an error occurs, takes a single Error parameter
 * @param {function} options.onMessage — callback called whenever data is received, takes a single Object parameter
 * @param {function} options.onOpen — callback called when the connection is opened, takes no parameters
 *
 * @example
 * const handleClose = function(code, description) {
 *   console.warn('Connection was closed with the following code: ' + code + ': ' + description);
 * };
 *
 * const handleError = function(error) {
 *   console.error(error);
 * };
 *
 * const handleMessage = function(message) {
 *   $('.messageElement').innerHTML = JSON.stringify(message, null, 2);
 * };
 *
 * handleOpen = function() {
 *   console.log('Connection established');
 * };
 *
 * const skClient = new Client({
 *   hostname: 'localhost',
 *   useTLS: true,
 *   version: 'v1',
 *   onClose: handleClose,
 *   onError: handleError,
 *   onMessage: handleMessage,
 *   onOpen: handleOpen
 * });
 */
function Client(options) {
}

/**
 * The connect method takes an optional object parameter with the following properties:
 *
 * @param {object} options
 * @param {object} options.mdns — if you want to enable mDNS support, pass the mDNS client library here
 * @param {object} options.primus — if you want to use Primus.js instead of raw WebSockets, pass an instance of Primus
 *
 * @returns a Signal K Connection object with the following signature:
 *
 * @param {string} hostname — the host ultimately connected to. This is typically the same as the host passed to the
 *   constructor, but might be different if the server has a different WebSockets host configured or if the client
 *   received an HTTP redirect or if the host was discovered via mDNS.
 * @param {string} version — the version of the Signal K API actually being used. Typically the same as the one
 *   requested, but if the server doesn't support the requested version, the next lower version that it does support
 *   will be what's used.
 * @param {string} locale — the server's locale, used when returning meta data such as unit names and labels.
 * @param {function} send — a function which takes a single parameter, either an object or a string to send to the
 *   server.
 * @param {function} disconnect — a function which takes no parameters and disconnects the WebSockets stream.
 * @param {function} subscribe — a function which takes a variable number of string parameters and subscribes to those
 *   paths in the default (self) context. Alternatively, it can take a full Signal K subscription object.
 * @param {function} unsubscribe — the inverse of the subscribe method.
 * @param {function} subscribeAll — a convienence function which subscribes the client to all Signal K paths.
 * @param {function} unsubscribeAll — a convienence function which unsubscribes the client from all Signal K paths.
 *
 * Refer the documentation of the [Subscription Protocol](signalk.org/specifiction/master/subscription_protocol.html)
 * for more details.
 *
 * @example
 * import mdns from 'mdns';
 * import Primus from 'primus';
 *
 * // Event handler setup and client instantiation, as above
 *
 * const skConnection = skClient.connectSync({mdns: mdns, primus: Primus});
 * skConnection.subscribe('navigation.*', 'environment.*', 'propulsion.*');
 *
 * // or
 * skConnection.subscribe({
 *   "context": "vessels.self",
 *   "subscribe": [{
 *     "path": "navigation.*"
 *   }, {
 *     "path": "environment.*"
 *   }, {
 *     "path": "propulsion.*"
 *   }]
 * });
 * 
 * // or
 * skConnection.subscribeAll();
 *
 */
Client.prototype.connect = function(options) {
}

/**
 * The `connectSync` method takes the same arguments as the `connect` method and returns an `skConnection` object.
 *
 * This is a blocking method, prefer the Promise based `connect` instead.
 *
 * @example
 * skClient.connect().then(function(skConnection) {
 *   skConnection.subscribeAll();
 *
 *   //or any of the other methods as described above
 * });
 */
Client.prototype.connectSync = function(options) {
}

/**
 * A convenience function to get Signal K data from the connected server. This is basically equivalent to usinging the
 * JavaScript Fetch API, with a base path of `<protocol>://<host>:[<port>]/signalk/<version>/api`.
 *
 * @param {string} path - path to fetch
 *
 * @example
 * skClient.get('/vessels').then(function(result) {
 *   console.log(result); // urn:mrn:signalk:uuid:c0d79334-4e25-4245-8892-54e8ccc8021d
 * });
 *
 */
Client.prototype.get = function(path) {
}

/**
 *
 * Returns an array of version objects describing the Signal K versions that the server supports.
 *
 * A client application may wish to use this information for diagnostic purposes or for finer-grained control over the
 * version of Signal K it is using.
 *
 * @example
 * skClient.getAvailableVersions().then(function(result) {
 *   result.forEach(function(version) {
 *     console.log(version.id + ': ' + version.version); // v1: 1.3.1, v2: 2.0.0.rc1
 *   };
 * });
 *
 */
Client.prototype.getAvailableVersions = function() {
}

/**
 * Gets the current full tree from the Signal K server for the `/vessels/self` path.
 *
 * This can be useful prior to subscribing to the WebSockets stream to prepopulate an instrument panel, especially for
 * slowly changing data points which would otherwise remain blank until they appeared in the data stream.
 *
 * @example
 * skClient.getSelf().then(function(result) {
 *   console.log(result);
 * });
 *
 */
Client.prototype.getSelf = function() {
}

/**
 * Returns a function which can be used to filter a WebSockets stream for the vessel specified by `self`. Generally, it
 * is better to let the server handle the filtering and only subscribe to to the `self` context. However, this can be
 * useful when displaying data for many vessels (e.g. on a live chart), while maintaining a separate display of local
 * vessel data.
 *
 * @example
 * skClient.getSelfMatcher().then(function(fnFilter) {
 *   // do something with the filter
 * });
 *
 */
Client.prototype.getSelfMatcher = function() {
}

/**
 * Get metadata for a specific path. Unless a specific context is passed, assumes `self`.
 *
 * @param {string} [path] - Path to get metadata for.
 *
 * The metadata object contains mostly optional properties. The only required property is `units`. Everything else is
 * optional.
 *
 * - `shortName` and `longName` — human-friendly display names.
 * - `units` — one of the Signal K SI abbreviations listed in
 *   [Appendix A](http://signalk.org/specification/master/keys/) of the Specification.
 * - `min` and `max` — min and max expected values for the path.
 * - `colors` — specifies display colors for different zone types
 * - `zones` — an array of display zones
 *   - `lower` and `upper` — start and stop points of zone, the first zone may elide `lower` and last zone `upper`
 *   - `state` — one of `alarm`, `warn`, `normal`
 *   - `methods` — an array of methods that the client should use to alert the user if the value enters the zone.
 *   Options are `audible` and `visual`
 *   - `message` — message that should be displayed next to the value
 *
 * @example
 * skClient.getMeta('electrical.batteries.1.voltage').then(function(meta) {
 *   console.log(meta);
 *   // {
 *   //   "shortName": "Volts",
 *   //   "longName": "House Battery Voltage",
 *   //   "units": "V",
 *   //   "min": 0,
 *   //   "max": 16,
 *   //   "colors": {
 *   //     "alarm": "#f00",
 *   //     "warn": "#ff0",
 *   //     "normal": "#ddd"
 *   //   },
 *   //   "zones": [{
 *   //     "upper": 10,
 *   //     "state": "alarm",
 *   //     "methods": ["audible", "visual"],
 *   //     "message": "Critically low voltage"
 *   //   }, {
 *   //     "lower": 10,
 *   //     "upper": 11.5,
 *   //     "state": "warn",
 *   //     "methods": ["visual"],
 *   //     "message": "Low voltage"
 *   //   }]
 *   // }
 * });
 *
 */
Client.prototype.getMeta = function(path) {
}

/**
 * Start mDNS based Signal K server discovery
 *
 * @param {functio} onNewHost - Function called whenever a new Signal K host is discovered
 *
 * @example
 * function gotNewHost(hostInfo) {
 *  console.log(hostInfo);
 * }
 *
 * skClient.startDiscovery(gotNewHost);
 *
 */
Client.prototype.startDiscovery = function(onNewHost) {
}

/**
 * Stop mDNS Signal K server discovery
 */
Client.prototype.stopDiscovery = function() {
}
