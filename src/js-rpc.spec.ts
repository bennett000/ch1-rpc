import { RemoteProcedure } from './remote-procedure';
/**
 * file: js-rpc-spec.js
 * Created by michael on 13/05/14
 */


describe('the js-rpc object is initialized with a \'remote\' object, like a worker, or a socket.io connection', function () {

  it('Should be a constructor that accepts one or more *valid* arguments', function () {
    expect(typeof RPC).toBe('function');
    expect(function () { RPC(); }).toThrow();
    expect(function () { RPC({}); }).toThrow();
    expect(function () { RPC(invalidRemote); }).toThrow();
    expect(function () { RPC(validDefaultRemote); }).not.toThrow();
    expect(function () { RPC(validCustomRemote, customDesc); }).not.toThrow();
    expect(new RPC(validDefaultRemote) instanceof RPC);
    expect(RPC(validDefaultRemote) instanceof RPC);
  });

  it('Should have post/listen methods after construction', function () {
    var p1 = false, msg = 'messagio',
      rpc = new RPC(
        {
          addEventListener: function (msg) { p1 = msg; },
          postMessage: function () {}
        }, {
          message: msg
        });

    expect(typeof rpc.listen).toBe('function');
    expect(typeof rpc.post).toBe('function');

    // this function should be called as part of the RPC bootstrapping
    expect(p1).toBe(msg);
  });
});

describe('the rpc object has public isReady, and onReady methods that aid in bootstrapping', function () {
  ;
  var rpc;
  beforeEach(function () {
    rpc = new RPC(validDefaultRemote);
  });

  it('should have an isReady method', function () {
    expect(typeof rpc.isReady).toBe('function');
  });

  it('should have an onReady method', function () {
    expect(typeof rpc.onReady).toBe('function');
  });

  it('should return the ready status of the object', function () {
    expect(rpc.isReady()).toBe(false);
    expect(rpc.isReady(true)).toBe(false);
  });

  it('on ready should accept functions, and fail silently for other data', function () {
    expect(function () {
      rpc.onReady(function () {});
    }).not.toThrow();

    expect(function () {
      rpc.onReady('tomato');
    }).not.toThrow();
  });

  describe('async ready tests', function () {
    var rpcA, rpcB;
    beforeEach(function () {
      var r = getRPCPairAsync(), nextTurn = false;

      rpcA = r.rpcA;
      rpcB = r.rpcB;

      // fast forward a turn so A, and B can catch each other's expose
      // methods
      setTimeout(function () {
        nextTurn = true;
      }, 0)

      waitsFor(function () {
        return nextTurn;
      });
    });

    it('should be initiall unready', function () {
      expect(rpcA.isReady()).toBe(false);
      expect(rpcB.isReady()).toBe(false);
    });

    it('should be unready if only one side is ready', function () {
      var done = false;
      expect(rpcA.isReady()).toBe(false);
      expect(rpcB.isReady()).toBe(false);

      rpcA.isReady(true);

      // skip a turn
      setTimeout(function () { done = true; }, 0);
      waitsFor(function () { return done; });

      runs(function () {
        expect(rpcA.isReady()).toBe(false);
        expect(rpcB.isReady()).toBe(false);
      });
    });

    it('should be ready if both sides are ready', function () {
      var done = false;
      expect(rpcA.isReady()).toBe(false);
      expect(rpcB.isReady()).toBe(false);

      rpcA.isReady(true);
      rpcB.isReady(true);

      // skip a turn
      setTimeout(function () { done = true; }, 0);
      waitsFor(function () { return done; });

      runs(function () {
        expect(rpcA.isReady()).toBe(true);
        expect(rpcB.isReady()).toBe(true);
      });
    });

    it('should execture onReady functions', function () {
      var done = false;
      expect(rpcA.isReady()).toBe(false);
      expect(rpcB.isReady()).toBe(false);

      rpcA.onReady(function () {
        done = true;
      });

      expect(rpcA.status().readyQueue).toBe(1);

      rpcA.isReady(true);
      rpcB.isReady(true);

      // skip a turn
      waitsFor(function () { return done; });

      runs(function () {
        expect(rpcA.isReady()).toBe(true);
        expect(rpcB.isReady()).toBe(true);
      });
    });
  });
});

describe('the rpc object has a public setPromiseLib function that allows for a promise interface', function () {
  ;
  var rpc;
  beforeEach(function () {
    rpc = new RPC(validDefaultRemote);
  });

  it('should have an isReady method', function () {
    expect(typeof rpc.setPromiseLib).toBe('function');
  });

  it('should throw given an invalid promise lib', function () {
    var fp = [];
    fp.push({});
    fp.push({ defer: function () {} });
    fp.push({ defer: function () { return {}; } });
    fp.push({ defer: function () { return { reject: function () {} }; } });
    fp.push({ defer: function () { return { resolve: function () {} }; } });
    fp.push({ defer: function () { return { resolve: function () {}, reject: function () {} }; } });
    fp.push({ defer: function () {
      return {
        resolve: function () {},
        reject: function () {},
        promise: {}
      };
    } });

    fp.forEach(function (falsePromise) {
      expect(function () {
        rpc.setPromiseLib(falsePromise);
      }).toThrow();
    });
  });

  it('should accept a valid promise lib', function () {
    expect(function () {
      rpc.setPromiseLib(Q);
    }).not.toThrow();
  });
});

describe('the object should provide a status update mechanism', function () {
  ;
  var rpcA, rpcB;
  beforeEach(function () {
    var r = getRPCPairAsync(), nextTurn = false;

    rpcA = r.rpcA;
    rpcB = r.rpcB;

    rpcA.expose({pizza: function () {
      return 'pi';
    }});

    rpcA.expose({cheese: function () {
      var d = Q.defer();
      d.reject(new Error('something had to go!'));
      return d.promise;
    }});

    rpcA.expose({coffee: function () {
      var d = Q.defer();
      d.resolve('tau');
      return d.promise;
    }});

    // fast forward a turn so A, and B can catch each other's expose
    // methods
    setTimeout(function () {
      nextTurn = true;
    }, 0)

    waitsFor(function () {
      return nextTurn;
    });
  });

  it('should have a status method', function () {
    expect(typeof rpcA.status).toBe('function');
    expect(typeof rpcA.status()).toBe('object');
    expect(rpcA.status()).toBeTruthy();
  });

  it('should report the callback queue count', function () {
    var done = false;
    expect(rpcA.status().resultCallbacks).toBe(0);
    expect(rpcB.status().resultCallbacks).toBe(0);
    rpcB.remotes.coffee.promise().then(function () {
      done = true;
    });

    expect(rpcB.status().resultCallbacks).toBe(1);

    waitsFor(function () {
      return done;
    });

    runs(function () {
      expect(rpcA.status().resultCallbacks).toBe(0);
      expect(rpcB.status().resultCallbacks).toBe(0);
    });
  });

  it('should report the callback queue count', function () {
    var done = false, done2 = false, done3 = false;
    expect(rpcA.status().resultCallbacks).toBe(0);
    expect(rpcB.status().resultCallbacks).toBe(0);
    rpcB.remotes.coffee.promise().then(function () {
      done = true;
    });

    expect(rpcB.status().resultCallbacks).toBe(1);

    rpcB.remotes.coffee.promise().then(function () {
      done2 = true;
    });

    rpcB.remotes.cheese.promise().then(function () {
    }, function () {
      done3 = true;
    });

    expect(rpcB.status().resultCallbacks).toBe(3);

    waitsFor(function () {
      return done && done2 && done3;
    });

    runs(function () {
      expect(rpcA.status().resultCallbacks).toBe(0);
      expect(rpcB.status().resultCallbacks).toBe(0);
    });
  });
});

describe('the rpc object should be able to handle string messages without failing', function () {
  ;
  var rpcA, rpcB;
  beforeEach(function () {
    var r = getRPCPair();
    rpcA = r.rpcA;
    rpcB = r.rpcB;
  });

  it('should be able to handle junk messages wihthout throwing', function () {
    expect(function () {
      rpcA.post('{sdfs', 2352, NaN, window);
    }).not.toThrow();
  });
});

describe('the rpc object has public error function that sends an error over the \'wire\'', function () {
  ;
  var rpc, rpcA, rpcB, listenersA = [], listenersB = [], result;
  beforeEach(function () {
    var r = getRPCPair();
    rpc = new RPC(
      {
        addEventListener: function () {},
        postMessage: function (data) {
          result = JSON.parse(data);
          if (result.error) { result = result.error; }
        }
      });

    rpcA = r.rpcA;
    rpcB = r.rpcB;
    listenersA = r.listenersA;
    listenersB = r.listenersB;
  });

  it('should have an error method', function () {
    expect(typeof rpc.error).toBe('function');
  });

  it('should send errors over the \'wire\'', function () {
    var msg = 'silly rabit tricks are for kids';
    rpc.error(msg);
    expect(result[0]).toBe(msg);
  });

  it('should use its own logger to note an error if error JSONing fails', function () {
    var errorCalled = false;
    rpc.setLogger({
      log: function () {},
      info: function () {},
      assert: function () {},
      warn: function () {},
      error: function () {
        errorCalled = true;
      }
    });
    expect(function () {
      rpc.error('blah', undefined, function () {}, 'craig', null, new Error(), NaN, ['blah', undefined, function () {}, 'craig', null, new Error(), NaN], window);
    }).not.toThrow();
    expect(errorCalled).toBe(true);
  });

  it('should send errors over the \'wire\', and the remote should log the error', function () {
    var msg1 = 'aaa', msg2 = 'bbb', errorA, errorB;

    rpcB.setLogger(
      {
        log: function () {},
        info: function () {},
        assert: function () {},
        warn: function () {},
        error: function (a, b) {
          errorA = a;
          errorB = b;
        }
      });

    rpcA.error(msg1, msg2);
    expect(errorA).toBe(msg1);
    expect(errorB).toBe(msg2);
  });
});

describe('the rpc object has public setLogger function that overrides the internal logger', function () {
  ;
  var rpc;
  beforeEach(function () {
    rpc = new RPC(validDefaultRemote);
  });

  it('should have a setLogger method', function () {
    expect(typeof rpc.setLogger).toBe('function');
  });

  it('should replace the default logger if the given logger is valid', function () {
    expect(rpc.setLogger(
      {
        log: function () {},
        info: function () {},
        assert: function () {},
        warn: function () {},
        error: function () {}
      })).toBe(true);

  });

  it('should return false given an invalid logger', function () {
    expect(rpc.setLogger()).toBe(false);
    expect(rpc.setLogger(
      {
        log: function () {},
        info: function () {},
        assert: function () {},
        warn: function () {}
      })).toBe(false);
    expect(rpc.setLogger(
      {
        log: function () {},
        info: function () {},
        assert: function () {}
      })).toBe(false);
    expect(rpc.setLogger(
      {
        log: function () {},
        info: function () {}
      })).toBe(false);
    expect(rpc.setLogger(
      {
        log: function () {}
      })).toBe(false);
    expect(rpc.setLogger({})).toBe(false);
  });
});

describe('the rpc object has a public expose method that allows objects to \'register\' ', function () {
  ;
  var rpc;
  beforeEach(function () {
    rpc = new RPC(validDefaultRemote);
  });

  it('should have an expose method!', function () {
    expect(typeof rpc.expose).toBe('function');
  });

  it('should return undefined given an object', function () {
    expect(rpc.expose({})).toBe(undefined);
    expect(rpc.expose({a: {}})).toBe(undefined);
    expect(rpc.expose({a: {b: function () {}}})).toBe(undefined);
  });

  it('should return an empty object (technically the exposed objects) given invalid parameters', function () {
    expect(typeof rpc.expose()).toBe('object');
    expect(typeof rpc.expose(null)).toBe('object');
    expect(typeof rpc.expose(235)).toBe('object');
    expect(typeof rpc.expose('tomato')).toBe('object');
    expect(typeof rpc.expose(function () {})).toBe('object');
  });

  it('should expose the expected objects, even with overwrite', function () {
    rpc.expose({
      'tomato': 'red'
    });
    expect(rpc.expose().tomato).toBe('red');

    rpc.expose({
      'banana': 'yellow'
    });
    expect(rpc.expose().tomato).toBe('red');
    expect(rpc.expose().banana).toBe('yellow');

    rpc.expose({
      'tomato': 'blue'
    });
    expect(rpc.expose().tomato).toBe('red');

    rpc.expose({
      'tomato': 'blue'
    }, true);
    expect(rpc.expose().tomato).toBe('blue');
  });

  it('should expose nested objects', function () {
    rpc.expose({
      'tomatoes': {
        'green': true,
        'red': true
      }
    });
    expect(rpc.expose().tomatoes.green).toBe(true);
  });

});

describe('the rpc object should handle onexpose messages, and build objects that can be called', function () {
  ;
  var rpcA, rpcB, listenersA = [], listenersB = [];

  beforeEach(function () {
    var r = getRPCPair();

    rpcA = r.rpcA;
    rpcB = r.rpcB;
    listenersA = r.listenersA;
    listenersB = r.listenersB;
  });

  it('should generate an exposed function on the other side', function () {

    rpcA.expose({
      test: function () {
        console.log('Je suis test 1');
      }
    });
    expect(rpcB.remotes.test).toBeTruthy();
    expect(rpcB.remotes.test instanceof RemoteProcedure).toBe(true);
  });

  it('should generate a nested exposed function on the other side', function () {

    rpcA.expose({
      test1: {
        test2: function () {
          console.log('Je suis test 1');
        }
      }
    });
    expect(rpcB.remotes.test1).toBeTruthy();
    expect(rpcB.remotes.test1.test2).toBeTruthy();
    expect(rpcB.remotes.test1.test2 instanceof RemoteProcedure).toBe(true);

    rpcA.expose({
      test3: {
        test4: {
          test5: function () {
            console.log('Je suis test 5');
          }
        }
      },
      test6: {
        test7: function () {
          console.log('Je suis test 7');
        }
      }
    });

    expect(rpcB.remotes.test1).toBeTruthy();
    expect(rpcB.remotes.test1.test2).toBeTruthy();
    expect(rpcB.remotes.test1.test2 instanceof RemoteProcedure).toBe(true);

    expect(rpcB.remotes.test3).toBeTruthy();
    expect(rpcB.remotes.test3.test4).toBeTruthy();
    expect(rpcB.remotes.test3.test4.test5).toBeTruthy();
    expect(rpcB.remotes.test3.test4.test5 instanceof RemoteProcedure).toBe(true);

    expect(rpcB.remotes.test6).toBeTruthy();
    expect(rpcB.remotes.test6.test7).toBeTruthy();
    expect(rpcB.remotes.test6.test7 instanceof RemoteProcedure).toBe(true);
  });
});

describe('the rpc object should correctly handle its expected dialect', function () {
  ;
  var rpcA, rpcB, listenersA = [], listenersB = [], errorTest = { error: false };

  // helper function for testing error logs
  function attachLogger(remote, errorObj) {
    rpcA.setLogger({
      log: function () {},
      info: function () {},
      assert: function () {},
      warn: function () {},
      error: function () {
        errorObj.error = true;
      }
    });

  }

  beforeEach(function () {
    errorTest = { error: false }

    var r = getRPCPair();

    rpcA = r.rpcA;
    rpcB = r.rpcB;
    listenersA = r.listenersA;
    listenersB = r.listenersB;
  });

  describe('results', function () {
    it('should log errors if given a malformed response (bad JSON) (really testing handler)', function () {
      attachLogger(rpcA, errorTest);
      listenersA[0]('someData');
      expect(errorTest.error).toBe(true);
    });

    it('should log errors if given a malformed response (non-array)', function () {
      attachLogger(rpcA, errorTest);
      listenersA[0]('{"results":"I am not an array"}');
      expect(errorTest.error).toBe(true);
    });

    it('should log errors if given a malformed response (no results)', function () {
      attachLogger(rpcA, errorTest);
      listenersA[0]('{"results":[]}');
      expect(errorTest.error).toBe(true);
    });

    it('should log errors if given a malformed response (no uid)', function () {
      attachLogger(rpcA, errorTest);
      listenersA[0]('{"results":[{}]}');
      expect(errorTest.error).toBe(true);
    });

    it('should log errors if RPC has no appropriate callback object', function () {
      attachLogger(rpcA, errorTest);
      listenersA[0]('{"results":[{"uid":"2352352"}]}');
      expect(errorTest.error).toBe(true);
    });

//        it('should log errors if RPC has no appropriate callback \'t\' function ', function () {
//            attachLogger(rpcA, errorTest);
//            listenersA[0]('{"results":[{"uid":"2352352"}]}');
//            expect(errorTest.error).toBe(true);
//        });

  });

  describe('invoke', function () {
    var rpcA, rpcB, array = [235, '2352', 5, true];
    beforeEach(function () {
      var r = getRPCPairAsync(), nextTurn = false;

      rpcA = r.rpcA;
      rpcB = r.rpcB;

      rpcA.expose({pizza: function () {
        return 'pi';
      }});

      rpcB.expose({fail: function () {
        throw new Error('feel my wrath fool');
      }});

      rpcA.expose({array: function () {
        return array;
      }});

      // fast forward a turn so A, and B can catch each other's expose
      // methods
      setTimeout(function () {
        nextTurn = true;
      }, 0)

      waitsFor(function () {
        return nextTurn;
      });
    });

    it('should invoke a given function', function () {
      var pass = false;
      expect(rpcB.remotes.pizza instanceof RemoteProcedure).toBe(true);
      rpcB.remotes.pizza.invoke().then(function (result) {
        pass = result;
        expect(result).toBe('pi');
      }, function () {
        pass = true;
      });

      waitsFor(function () {
        return pass;
      });

      runs(function () {
        expect(pass).toBe('pi');
      });
    });

    it('should invoke a given function (array)', function () {
      var pass = false;
      expect(rpcB.remotes.array instanceof RemoteProcedure).toBe(true);
      rpcB.remotes.array.invoke().then(function (result) {
        pass = result;
        expect(result.toString()).toBe(array.toString());
      }, function () {
        pass = true;
      });

      waitsFor(function () {
        return pass;
      });

      runs(function () {
        expect(pass.toString()).toBe(array.toString());
      });
    });

    it('should catch exceptions from function executed', function () {
      var pass = false, f = false;
      expect(rpcA.remotes.fail instanceof RemoteProcedure).toBe(true);
      rpcA.remotes.fail.invoke().then(function (result) {
        // shouldn't happen
        pass = true;
      }, function badIsGood(reason) {
        f = true;
        pass = true;
        expect(reason.message).toBe('feel my wrath fool');
      });

      waitsFor(function () {
        return pass;
      });

      runs(function () {
        expect(f).toBe(true);
      });
    });
  });

  describe('promise', function () {
    var rpcA, rpcB, array = [1, 2, 3, 4, 5, '1234124', 2424],
      errorMsg = 'broken promises';
    beforeEach(function () {
      var r = getRPCPairAsync(), nextTurn = false;

      rpcA = r.rpcA;
      rpcB = r.rpcB;

      rpcA.expose({promiseTrue: function () {
        var d = Q.defer();

        setTimeout(function () {
          d.resolve(true);
        }, 35);

        return d.promise;
      }});

      rpcB.expose({promiseArray: function () {
        var d = Q.defer();

        setTimeout(function () {
          d.resolve(array);
        }, 25);

        return d.promise;
      }});

      rpcB.expose({promiseFail: function () {
        var d = Q.defer();
        setTimeout(function () {
          d.reject(new Error(errorMsg));
        }, 15);
        return d.promise;
      }});

      // fast forward a turn so A, and B can catch each other's expose
      // methods
      setTimeout(function () {
        nextTurn = true;
      }, 0)

      waitsFor(function () {
        return nextTurn;
      });
    });

    it('should be able to call a promise on the remote (true)', function () {
      var done = false, result = false;

      rpcB.remotes.promiseTrue.promise().then(function (r) {
        done = true;
        result = r;
      }, function () {
        done = true;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result).toBe(true);
      });
    });

    it('should be able to call a promise on the remote (fail)', function () {
      var done = false, result = false;

      rpcA.remotes.promiseFail.promise().then(function (r) {
        done = true;
      }, function (reason) {
        done = true;
        result = reason.message;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result).toBe(errorMsg);
      });
    });

    it('should be able to call a promise on the remote (array)', function () {
      var done = false, result = false;

      rpcA.remotes.promiseArray.promise().then(function (r) {
        done = true;
        result = r;
      }, function () {
        done = true;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result.toString()).toBe(array.toString());
      });
    });
  });

  describe('callback', function () {
    var rpcA, rpcB, array = [1, 2, 3, 4, 5, '1234124', 2424],
      errorMsg = 'broken callbacks';
    beforeEach(function () {
      var r = getRPCPairAsync(), nextTurn = false;

      rpcA = r.rpcA;
      rpcB = r.rpcB;

      rpcA.expose({callbackTrue: function (next) {
        setTimeout(function () {
          next(null, true);
        }, 35);
      }});

      rpcB.expose({callbackArray: function (next) {
        setTimeout(function () {
          next(null, array);
        }, 25);
      }});

      rpcB.expose({callbackFail: function (next) {
        setTimeout(function () {
          next(new Error(errorMsg));
        }, 15);
      }});

      rpcB.expose({callbackArgs1: function (p1, next) {
        setTimeout(function () {
          next(null, p1);
        }, 15);
      }});

      rpcB.expose({callbackArgs2: function (p1, p2, next) {
        setTimeout(function () {
          next(null, p1, p2);
        }, 15);
      }});

      // fast forward a turn so A, and B can catch each other's expose
      // methods
      setTimeout(function () {
        nextTurn = true;
      }, 0)

      waitsFor(function () {
        return nextTurn;
      });
    });

    it('should be able to call a callback on the remote (true)', function () {
      var done = false, result = false;

      rpcB.remotes.callbackTrue.callback().then(function (r) {
        done = true;
        result = r[0];
      }, function () {
        done = true;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result).toBe(true);
      });
    });

    it('should be able to call a callback on the remote (array)', function () {
      var done = false, result = false;

      rpcA.remotes.callbackArray.callback().then(function (r) {
        done = true;
        result = r[0];
      }, function () {
        done = true;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result.toString()).toBe(array.toString());
      });
    });

    it('should be able to call a callback on the remote (error)', function () {
      var done = false, result = false;

      rpcA.remotes.callbackFail.callback().then(function (r) {
        done = true;
      }, function (r) {
        done = true;
        result = r.message;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result).toBe(errorMsg);
      });
    });

    it('should be able to call a callback with a parameter', function () {
      var done = false, result = false;

      rpcA.remotes.callbackArgs1.callback('hi').then(function (r) {
        done = true;
        result = r;
      }, function () {
        done = true;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result[0]).toBe('hi');
      });
    });

    it('should be able to call a callback with parameters', function () {
      var done = false, result = false;

      rpcA.remotes.callbackArgs2.callback('hi', 'there').then(function (r) {
        done = true;
        result = r;
      }, function () {
        done = true;
      });

      waitsFor(function () { return done; });

      runs(function () {
        expect(result[0]).toBe('hi');
        expect(result[1]).toBe('there');
      });
    });
  });

  describe('listen, and ignore!', function () {
    var rpcA, rpcB;
    beforeEach(function () {
      var r = getRPCPairAsync(), nextTurn = false, listeners = {};
      listeners['catInBox'] = {};

      rpcA = r.rpcA;
      rpcB = r.rpcB;

      rpcA.expose(
        {
          catInBox: {
            listen: function (msg, fn) {
              if (!listeners.catInBox[msg]) {
                listeners.catInBox[msg] = {};
              }

              var uid = 'i' + Math.random();
              listeners.catInBox[msg][uid] = fn;

              return uid;
            }, ignore: function (uid) {

            }
          }
        });

      rpcA.notice = function (msg, data) {
        Object.keys(listeners).forEach(function (fnKey) {
          Object.keys(listeners[fnKey]).forEach(function (msgKey) {
            if (msgKey !== msg) {
              return;
            }
            Object.keys(listeners[fnKey][msgKey]).forEach(function (callbackKey) {
              listeners[fnKey][msgKey][callbackKey](data);
            });
          });
        });
      };

      // fast forward a turn so A, and B can catch each other's expose
      // methods
      setTimeout(function () {
        nextTurn = true;
      }, 0)

      waitsFor(function () {
        return nextTurn;
      });
    });

    it('should register listeners', function () {
      var done = false, listenId, done2, done3;
      listenId = rpcB.remotes.catInBox.listen.listen('doc', function (data) {
        if (!done) {
          done = data;
        } else {
          done2 = data;
        }
      });

      expect(listenId).toBeTruthy();

      // wait a turn so the listener can register
      setTimeout(function () {
        // notify
        rpcA.notice('doc', 'marty');
      }, 0);

      waitsFor(function () {
        return done;
      });

      runs(function () {
        expect(done).toBe('marty');
        expect(rpcA.status().listenerIds).toBe(1);
        expect(rpcB.status().resultCallbacks).toBe(1);
        rpcA.notice('doc', 'delorean');
      });

      waitsFor(function () {
        return done2;
      });

      runs(function () {
        expect(done2).toBe('delorean');
        expect(rpcA.status().listenerIds).toBe(1);
        expect(rpcB.status().resultCallbacks).toBe(1);
        rpcB.remotes.catInBox.listen.ignore(listenId);
        setTimeout(function () {
          done3 = true;
        }, 15);
      });

      waitsFor(function () {
        return done3;
      });

      runs(function () {
        expect(done3).toBe(true);
        expect(rpcA.status().listenerIds).toBe(0);
        expect(rpcB.status().resultCallbacks).toBe(0);
      });
    });
  });

});