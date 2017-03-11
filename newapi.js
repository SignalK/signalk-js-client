/**
 * Represents a connection to a Signal K Server.
 * @constructor
 * @param {string} url The url of the Signal K host.
 */
/**
 * Represents a connection to a Signal K Server.
 * @constructor
 * @param options Options parameter.
 * @param options.hostUrl {string} Url to the root of the server, for example https://demo.signalk.org/.
 * Allows one to specify the protocol
 * @param options.host {string} Hostname/address of the server.
 * @param options.port {number} Port to connect to on the server.
 * @param options.subscribe {string} Subscribe parameter to the delta connection.
 * @param options.connectDelta {boolean} [true] Should delta stream connection be established.
 */
function Connection(params) {

  /**
   * State of the delta connection.
   * @type boolean
   **/
  this.isConnected

  /**
   * Fired upon delta message reception. Event data is a delta message.
   *
   * @event Connection#delta
   * @type {object}
   */

  /**
   * Fired on stream WebSocket connection establishment.
   *
   * @event Connection#connected
   * @type {null}
   */

  /**
   * Fired after connect when receiving hello message from the server. Payload is the hello message.
   *
   * @event Connection#hello
   * @type {object}
   */

  /**
   * Fired on  WebSocket disconnect.
   *
   * @event Connection#disconnect
   * @type {null}
   */

  /**
   * Fired on delta WebSocket connection error.
   *
   * @event Connection#error
   * @type {error}
   */

   /**
    * Fired upon reception of server metadata (the response for GET /signalk)
    *
    * @event Connection#metadata
    * @type {error}
    */
}


/**
 * Initiate a connection to a Signal K server
 * @returns {Promise<Connection>}
 */
function connect(url) {
}


/**
 * Signal K Discovery process.
 * @class
 */
function DiscoveryProcess() {
  /**
   * State of the discovery activity.
   * @type boolean
   **/
  this.isDiscovering


  /**
   * Start the discovery process.
   * @param callback Callback to call upon discovery.
   * @returns {Promise<DiscoveredHost>} A Promise to the discovered host.
   **/
  this.start = function(callback) {
  }

  /**
   * Stop the discovery process.
   **/
  this.stop = function() {
  }

  /**
   * Fired on discovery of a Signal K server/gateway.
   *
   * @event DiscoveryProcess#discovery
   * @type {object}
   */
}

/**
 * Signal K Discovery process.
 * @class
 */
function DiscoveredHost() {
  /**
   * Hostname or ip address of the discovered server.
   * @type {string}
   **/
  this.host

  /**
   * Port of the discovered server.
   * @type {number}
   **/
  this.port

  /**
   * Roles of the discovered server.
   * @type {Array.<string>}
   **/
  this.roles

  /**
   * Self id of the discovered server.
   * @type {string}
   **/
  this.self

  /**
   * Software name of the discovered server.
   * @type {string}
   **/
  this.swname

  /**
   * Software version of the discovered server.
   * @type {string}
   **/
  this.swversion
}
