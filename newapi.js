/**
 * Represents a connection to a Signal K Server.
 * @constructor
 * @param {string} url The url of the Signal K host.
 */
/**
 * Represents a connection to a Signal K Server.
 * @constructor
 * @param options Options parameter.
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
   * Fired upon delta message reception.
   *
   * @event Connection#connect
   * @type {object}
   */

  /**
   * Fired on delta WebSocket connection establishment.
   *
   * @event Connection#connect
   * @type {null}
   */

  /**
   * Fired after connect when receiving hello message from the server. Payload is the hello message.
   *
   * @event Connection#connect
   * @type {object}
   */

  /**
   * Fired on delta WebSocket disconnect.
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
