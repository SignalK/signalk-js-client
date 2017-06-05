/**
 * @class
 * @summary Create a new Signal K Client
 *
 * @description
 * The constructor can take either a single string parameter which will be used as a host to connect to or a
 * configuration object with the parameters below. Note, that if you're using mdns, but _not_ passing any configuration
 * parameters, you MUST pass either an empty Object or `null` as the first parameter.
 *
 * @param {Object|string} options If a string is passed, the host to connect to, assumes default ports. If more
 *   configuration is required pass an object with the properties described below.
 * @param {string} options.hostname Host to connect to, e.g. localhost
 * @param {number} [options.port] Override the standard ports of 80/443
 * @param {boolean} [options.useTLS] Set to `true` if the client should use TLS, defaults to `false`
 * @param {string} [options.version] string indicating the version of the Signal K API the client should use, defaults
 *   to v1
 * @param {closeHandler} [options.onClose] callback called when the connection is closed
 * @param {errorHandler} [options.onError] callback called when an error occurs
 * @param {messageHandler} [options.onMessage] callback called whenever data is received
 * @param {function} [options.onOpen] callback called when the connection is opened, takes no parameters
 * @param {Object} [mdns] If you want to use mDNS with the Signal K client, pass it in here
 *
 * @returns {Promise}
 *
 * @example
 * import mdns from 'mdns';
 *
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
 *
 * // or, if not using WebSockets and just interested in connecting to a specific server for the HTTP API
 * const skClient = new Client('localhost');
 *
 * // or, using mDNS to find servers
 * const skClient = new Client(null, mdns);
 *
 * // or, specifying some settings with mdns
 * const skClient = new Client({
 *   onMessage: handleMessage
 * }, mdns);
 *
 */
function Client(options) {
}

/**
 * @summary
 * Connect to a Signal K WebSocket stream. Takes a single optional parameter and returns a Promise.
 *
 * @description
 * The `connect` method establishes a Signal K WebSocket stream connection. If called with no parameter, `connect`
 * connects with the `subscribe` query parameter set to `none` and requires that the call to `connect` is followed by a
 * to one of the `subscribe*` functions on the {@link skConnection} object within the returned Promise.
 *
 * Refer the documentation of the [Subscription
 * Protocol](http://signalk.org/specification/master/subscription_protocol.html) for more details.
 *
 * @param {enum} subscriptionType One of `none`, `self` or `all`.
 *
 * @example
 * import mdns from 'mdns';
 * import Primus from 'primus';
 *
 * // Event handler setup and client instantiation, as above
 *
 * const skConnection = skClient.connect().then(function(skConnection) {
 *   skConnection.subscribe('navigation.*', 'environment.*', 'propulsion.*')
 *
 *   // or
 *   skConnection.subscribe({
 *     "context": "vessels.self",
 *     "subscribe": [{
 *       "path": "navigation.*"
 *     }, {
 *       "path": "environment.*"
 *     }, {
 *       "path": "propulsion.*"
 *     }]
 *   });
 *
 *   // or
 *   skConnection.subscribeAll();
 * });
 *
 * // or, if the host you're connecting to does not support the subscription protocol
 * const skConnection = skClient.connect('self').then(function(skConnection) {
 *   // do something with the skConnection object.
 * });
 */
Client.prototype.connect = function(options) {
}

/**
 * `The connectSync` method takes the same arguments as the connect method and returns an {@link skConnection} object.
 *
 * This is a blocking method, prefer the Promise based connect instead.
 *
 * @returns {skConnection} A Signal K Connection object
 *
 * @example
 * const skConnection = skClient.connect('self');
 *
 * skConnection.subscribeAll();
 *
 * // or any of the other methods as described above
 */
Client.prototype.connectSync = function(options) {
}

/**
 * A convenience function to get Signal K data from the connected server. This is basically equivalent to usinging the
 * JavaScript Fetch API, with a base path of `<protocol>://<host>:[<port>]/signalk/<version>/api`.
 *
 * @param {string} path path to fetch
 *
 * @returns {Promise}
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
 * Returns an array of version objects describing the Signal K versions that the server supports.
 *
 * A client application may wish to use this information for diagnostic purposes or for finer-grained control over the
 * version of Signal K it is using.
 *
 * @returns {Promise}
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
 * @returns {Promise}
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
 * @returns {Promise}
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
 * @returns {Promise}
 *
 * The metadata object contains mostly optional properties. The only required property is `units`. Everything else is
 * optional.
 *
 * @prop {string} [shortName] Human friendly, appreviated label
 * @prop {string} [longName] Human friendly, spelled out label
 * @prop {string} units One of the Signal K SI abbreviations listed in
 *   [Appendix A](http://signalk.org/specification/master/keys/) of the Specification.
 * @prop {Number} [min] minimum display value for the path.
 * @prop {Number} [max] maximum expected values for the path.
 * @prop {Object} [colors] Specifies display colors for different zone types
 * @prop {Zone[]} [zones] an array of display zones
 *   - `lower` and `upper` start and stop points of zone, the first zone may elide `lower` and last zone `upper`
 *   - `state` one of `alarm`, `warn`, `normal`
 *   - `methods` an array of methods that the client should use to alert the user if the value enters the zone.
 *   Options are `audible` and `visual`
 *   - `message` message that should be displayed next to the value
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
 */
Client.prototype.getMeta = function(path) {
}

/**
 * Start mDNS based Signal K server discovery
 *
 * @param {newHostHandler} onNewHost - Function called whenever a new Signal K host is discovered
 *
 * @example
 * function gotNewHost(hostInfo) {
 *  console.log(hostInfo);
 * }
 *
 * skClient.startDiscovery(gotNewHost);
 */
Client.prototype.startDiscovery = function(onNewHost) {
}

/**
 * Stop mDNS Signal K server discovery
 */
Client.prototype.stopDiscovery = function() {
}

/**
 * @typedef skConnection
 * @type {Object}
 * @prop {string} hostname the host ultimately connected to. This is typically the same as the host passed to the
 *   constructor, but might be different if the server has a different WebSockets host configured or if the client
 *   received an HTTP redirect or if the host was discovered via mDNS.
 * @prop {string} version the version of the Signal K API actually being used. Typically the same as the one
 *   requested, but if the server doesn't support the requested version, the next lower version that it does support
 *   will be what's used.
 * @prop {string} locale the server's locale, used when returning meta data such as unit names and labels.
 * @prop {function} send a function which takes a single parameter, either an object or a string to send to the
 *   server.
 * @prop {function} disconnect a function which takes no parameters and disconnects the WebSockets stream.
 * @prop {function} subscribe a function which takes a variable number of string parameters and subscribes to those
 *   paths in the default (self) context. Alternatively, it can take a full Signal K subscription object.
 * @prop {function} unsubscribe the inverse of the subscribe method.
 * @prop {function} subscribeAll a convienence function which subscribes the client to all Signal K paths.
 * @prop {function} unsubscribeAll a convienence function which unsubscribes the client from all Signal K paths.
 */

/**
 * @typedef skDelta
 * @type {Object}
 *
 * @description
 * See documentation on the [Signal K Delta](http://signalk.org/specification/master/data_model.html#delta-format)
 *   message documentation.
 *
 */

/**
 * @callback closeHandler
 * @param {number} code Reason code
 * @param {string} description Message explaining reason for the connection closing
 */

/**
 * @callback errorHandler
 * @param {Error} error Error object returned by the underlying WebSocket implementation
 */

/**
 * @callback messageHandler
 * @param {skDelta} message Signal K message object
 */

/**
 * @callback newHostHandler
 * @param {Object} newHost Signal K host description object
 */
