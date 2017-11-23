const {assert} = require('chai');
const expect = require('expect.js');
const mockedRequest = require('superagent');
const mocks = require('./mock.config');
const {Server} = require('mock-socket');
const Client = require('../index');

require('superagent-mock')(mockedRequest, mocks);

describe('Client#connect', () => {
  it('configures WebSocket and API URIs', done => {
    const client = new Client('example.host');

    client.connect().then(skClient => {
      expect(skClient.wsPath).to.equal('ws://example.host:1234/signalk/v1/stream');
      expect(skClient.apiPath).to.equal('http://example.host:1234/signalk/v1/api/');
      done();
    });
  });

  it('throws an exception if the server does not support requested version', (done) => {
    const client = new Client({
      hostname: 'example.host',
      version: 'v2'
    });

    client.connect().then(skClient => {
    }).catch(Error, e => {
      expect(e.toString()).to.be('Error: Server does not support Signal K version v2');
      done();
    }).catch(done);
  });
});
