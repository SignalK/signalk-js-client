const chaiAsPromised = require("chai-as-promised");
const chai = require('chai');
chai.use(chaiAsPromised);
const assert = chai.assert;
const expect = chai.expect;
const mockedRequest = require('superagent');
const mocks = require('./mock.config');
const sinon = require('sinon');
const WebSocket = require('mock-socket').WebSocket;
const Server = require('mock-socket').Server;

global.WebSocket = WebSocket;

require('superagent-mock')(mockedRequest, mocks);

const Client = require('../index');

let servers = [];

describe('Client#connect', function() {
  before(function() {
    if(servers.length === 0) {
      servers.push(new Server('ws://example.host:1234/signalk/v1/stream?subscribe=none'));
      servers.push(new Server('ws://example.host:1234/signalk/v1/stream?subscribe=all'));
      servers.push(new Server('ws://example.host:1234/signalk/v1/stream?subscribe=self'));
    }
  });

  after(function() {
    do {
      servers.pop().stop();
    } while(servers.length > 0);
  });

  beforeEach(function(done) {
    sinon.spy(WebSocket.prototype, 'send');
    sinon.spy(WebSocket.prototype, 'addEventListener');
    done();
  });

  afterEach(function() {
    WebSocket.prototype.send.restore();
    WebSocket.prototype.addEventListener.restore();
  });

  it('queries server for endpoints', function() {
    const skClient = new Client('example.host');
    skClient.connect();
  });

  it('subscribes to none with no parameters', function() {
    const skClient = new Client('example.host');
    skClient.connect().then(function(skConnection) {
      expect(skConnection.wsUrl).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=none');
    });
  });

  it('subscribes to none when passed "none"', function() {
    const skClient = new Client('example.host');
    skClient.connect('none').then(function(skConnection) {
      expect(skConnection.wsUrl).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=none');
    });
  });

  it('subscribes to self when passed "self"', function() {
    const skClient = new Client('example.host');
    skClient.connect('self').then(function(skConnection) {
      expect(skConnection.wsUrl).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=self');
    });
  });

  it('subscribes to all when passed "all"', function() {
    const skClient = new Client('example.host');
    skClient.connect('all').then(function(skConnection) {
      expect(skConnection.wsUrl).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=all');
    });
  });

  it('subscribes to none when passed random junk', function() {
    const skClient = new Client('example.host');
    skClient.connect('foobar').then(function(skConnection) {
      expect(skConnection.wsUrl).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=none');
    });
  });

  it('sends a subscription message when passed a string', function() {
    const skClient = new Client('example.host');
    const expected = {
      context: 'vessels.self',
      subscribe: [{
        path: 'foobar'
      }]
    };

    return skClient.connect('foobar').then(function(skConnection) {
      const actual = WebSocket.prototype.send.getCall(0).args[0];
      expect(JSON.parse(actual)).to.eql(expected);
    });
  });

  it('sends a subscription message when passed multiple strings', function() {
    const skClient = new Client('example.host');
    const expected = {
      context: 'vessels.self',
      subscribe: [{
        path: 'foo'
      }, {
        path: 'bar'
      }, {
        path: 'baz'
      }]
    };

    return skClient.connect('foo', 'bar', 'baz').then(function(skConnection) {
      const actual = WebSocket.prototype.send.getCall(0).args[0];
      expect(JSON.parse(actual)).to.eql(expected);
    });
  });

  it('registers callbacks, if defined in constructor', function() {
    const skClient = new Client({
      hostname: 'example.host',
      onClose: function() { },
      onError: function() { },
      onMessage: function() { },
      onOpen: function() { }
    });

    return skClient.connect().then(function(skConnection) {
      expect(WebSocket.prototype.addEventListener.callCount).to.equal(4);
    });
  });
});
