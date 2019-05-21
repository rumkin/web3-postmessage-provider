/* eslint-disable max-statements */
;(function(global) {
  const ETHEREUM_PROVIDER_REQUEST = 'ETHEREUM_PROVIDER_REQUEST';
  const ETHEREUM_PROVIDER_SUCCESS = 'ETHEREUM_PROVIDER_SUCCESS';

  var PostMessageProvider = function PostMessageProvider(options)  {
    var _this = this;
    this.responseCallbacks = {};
    this.notificationCallbacks = [];

    options = options || {};
    this._requestTimeout = options.requestTimeout || options.timeout;
    this._handshakeTimeout = options.handshakeTimeout || options.timeout || 1000;

    this.isConnecting = true;
    this.port = null;
    var timeout;

    function onMessage(e) {
      const {type} = e.data;

      if (e.origin !== window.origin) {
        return;
      }

      if (type !== ETHEREUM_PROVIDER_SUCCESS) {
        return;
      }
      _this.isConnecting = false;
      _this.port = e.ports[0];
      _this.port.onmessage = onDataMessage;

      window.removeEventListener('message', onMessage);
      clearTimeout(timeout);
    }

    timeout = setTimeout(function() {
      _this.isConnecting = false;
      window.removeEventListener('message', onMessage);
    }, this._handshakeTimeout);

    window.addEventListener('message', onMessage);
    window.postMessage({type: ETHEREUM_PROVIDER_REQUEST}, window.origin);

    // LISTEN FOR CONNECTION RESPONSES
    function onDataMessage(e) {
      var result = e.data;
      var id = null;

      // get the id which matches the returned id
      if (isArray(result)) {
        result.forEach(function(load){
          if (_this.responseCallbacks[load.id]) {
            id = load.id;
          }
        });
      }
      else {
        id = result.id;
      }

      // notification
      if (!id && result.method.indexOf('_subscription') !== -1) {
        _this.notificationCallbacks.forEach(function(callback){
          if (isFunction(callback)) {
            callback(result);
          }
        });

        // fire the callback
      }
      else if (_this.responseCallbacks[id]) {
        _this.responseCallbacks[id](null, result);
        delete _this.responseCallbacks[id];
      }
    };
  };

  PostMessageProvider.ETHEREUM_PROVIDER_REQUEST = ETHEREUM_PROVIDER_REQUEST;
  PostMessageProvider.ETHEREUM_PROVIDER_SUCCESS = ETHEREUM_PROVIDER_SUCCESS;

  /**
   Will add the error and end event to timeout existing calls

   @method _defaultCallback
   */
  PostMessageProvider.prototype._defaultCallback = function(error){
    if (error) {
      console.error(error);
    }
  };

  /**
   Adds a callback to the responseCallbacks object,
   which will be called if a response matching the response Id will arrive.

   @method _addResponseCallback
   */
  PostMessageProvider.prototype._addResponseCallback = function(payload, callback) {
    var id = payload.id || payload[0].id;
    var method = payload.method || payload[0].method;

    this.responseCallbacks[id] = callback || this._defaultCallback;
    this.responseCallbacks[id].method = method;

    var _this = this;

    // schedule triggering the error response if a custom timeout is set
    if (this._requestTimeout) {
      setTimeout(function () {
        if (_this.responseCallbacks[id]) {
          _this.responseCallbacks[id](
            new Error('CONNECTION TIMEOUT: timeout of ' + _this._requestTimeout + ' ms achived')
          );
          delete _this.responseCallbacks[id];
        }
      }, this._requestTimeout);
    }
  };

  /**
   Timeout all requests when the end/error event is fired

   @method _timeout
   */
  PostMessageProvider.prototype._timeout = function() {
    for (var key in this.responseCallbacks) {
      if (this.responseCallbacks.hasOwnProperty(key)){
        this.responseCallbacks[key](
          new Error('CONNECTION ERROR: Couldn\'t connect to node with PostMessage.')
        );
        delete this.responseCallbacks[key];
      }
    }
  };

  PostMessageProvider.prototype.send = function (payload, callback) {
    var _this = this;

    if (this.isConnecting) {
      setTimeout(function () {
        _this.send(payload, callback);
      }, 100);
      return;
    }

    // try reconnect, when connection is gone
    // if (!this.connection.writable)
    //     this.connection.connect({url: this.url});
    if (this.port === null) {
      callback(new Error('connection not open'));
      return;
    }

    this.port.postMessage(JSON.parse(JSON.stringify(payload)));
    this._addResponseCallback(payload, callback);
  };

  /**
   Subscribes to provider events.provider

   @method on
   @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
   @param {Function} callback   the callback to call
   */
  PostMessageProvider.prototype.on = function (type, callback) {
    if (typeof callback !== 'function') {
      throw new Error('The second parameter callback must be a function.');
    }

    switch (type){
    case 'data':
      this.notificationCallbacks.push(callback);
      break;
    }
  };

  // TODO add once

  /**
   Removes event listener

   @method removeListener
   @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
   @param {Function} callback   the callback to call
   */
  PostMessageProvider.prototype.removeListener = function (type, callback) {
    var _this = this;

    switch (type){
    case 'data':
      this.notificationCallbacks.forEach(function(cb, index){
        if (cb === callback) {
          _this.notificationCallbacks.splice(index, 1);
        }
      });
      break;
    }
  };

  /**
   Removes all event listeners

   @method removeAllListeners
   @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
   */
  PostMessageProvider.prototype.removeAllListeners = function (type) {
    switch (type){
    case 'data':
      this.notificationCallbacks = [];
      break;

    default:
      // this.connection.removeAllListeners(type);
      break;
    }
  };

  /**
   Resets the providers, clears all callbacks

   @method reset
   */
  PostMessageProvider.prototype.reset = function () {
    this._timeout();
    this.notificationCallbacks = [];
  };

  function isArray(value) {
    return Array.isArray(value);
  }

  function isFunction(value) {
    return typeof value === 'function';
  }

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = PostMessageProvider;
  }
  else if (typeof define === 'function' && define.amd) {
    define(function() {
      return PostMessageProvider;
    });
  }
  else {
    global.PostMessageProvider = PostMessageProvider;
  }
})(typeof self !== 'undefined' ? self : this);
