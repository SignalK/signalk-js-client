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

describe('Client#subscribe', () => {
  before(() => {
    if(servers.length === 0) {
      servers.push(new Server('ws://example.host:1234/signalk/v1/stream?subscribe=none'));
      servers.push(new Server('ws://example.host:1234/signalk/v1/stream?subscribe=all'));
      servers.push(new Server('ws://example.host:1234/signalk/v1/stream?subscribe=self'));
    }
  });

  after(() => {
    do {
      servers.pop().stop();
    } while(servers.length > 0);
  });

  beforeEach(() => {
    sinon.spy(WebSocket.prototype, 'send');
    sinon.spy(WebSocket.prototype, 'addEventListener');
  });

  afterEach(() => {
    WebSocket.prototype.send.restore();
    WebSocket.prototype.addEventListener.restore();
  });

  it('subscribes to none with no parameters', () => {
    const skClient = new Client('example.host');
    return skClient.connect().then(skConnection => {
      return skConnection.subscribe().then(() => {
        expect(skConnection.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=none');
      });
    });
  });

  it('subscribes to none when passed "none"', () => {
    const skClient = new Client('example.host');
    skClient.connect().then(skConnection => {
      return skConnection.subscribe('none').then(() => {
        expect(skConnection.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=none');
      });
    });
  });

  it('subscribes to self when passed "self"', () => {
    const skClient = new Client('example.host');
    skClient.connect().then(skConnection => {
      skConnection.subscribe('self');
      expect(skConnection.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=self');
    });
  });

  it('subscribes to all when passed "all"', () => {
    const skClient = new Client('example.host');
    skClient.connect().then(skConnection => {
      skConnection.subscribe('all');
      expect(skConnection.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=all');
    });
  });

  it('subscribes to all with subscribeAll', () => {
    const skClient = new Client('example.host');
    skClient.connect().then(skConnection => {
      skConnection.subscribeAll();
      expect(skConnection.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=all');
    });
  });

  it('subscribes to none when passed random junk', () => {
    const skClient = new Client('example.host');
    return skClient.connect().then(skConnection => {
      return skConnection.subscribe('random.junk').then(() => {
        expect(skConnection.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream?subscribe=none');
      });
    });
  });

  it('sends a subscription message when passed a string', () => {
    const skClient = new Client('example.host');
    const expected = {
      context: 'vessels.self',
      subscribe: [{
        path: 'foobar'
      }]
    };

    return skClient.connect().then(skConnection => {
      return skConnection.subscribe('foobar').then(() => {
        expect(WebSocket.prototype.send.getCalls()).to.have.lengthOf(1);
        const actual = WebSocket.prototype.send.getCall(0).args[0];
        expect(JSON.parse(actual)).to.eql(expected);
      });
    });
  });

  it('sends a subscription message when passed multiple strings', () => {
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

    return skClient.connect().then(skConnection => {
      return skConnection.subscribe('foo', 'bar', 'baz');
    }).then(() => {
      expect(WebSocket.prototype.send.getCalls()).to.have.lengthOf(1);
      const actual = WebSocket.prototype.send.getCall(0).args[0];
      expect(JSON.parse(actual)).to.eql(expected);
    });
  });

  it('registers callbacks, if defined in constructor', () => {
    const skClient = new Client({
      hostname: 'example.host',
      onClose: function() { },
      onError: function() { },
      onMessage: function() { },
      onOpen: function() { }
    });

    return skClient.connect().then(function(skConnection) {
      return skConnection.subscribe();
    }).then(() => {
      expect(WebSocket.prototype.addEventListener.callCount).to.equal(4);
    });
  });
});
