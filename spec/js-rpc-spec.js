/**
 * file: js-rpc-spec.js
 * Created by michael on 13/05/14
 */

/*global window, jasmine, beforeEach, describe, expect, waitsFor, spyOn, runs, it, module,inject, workular, RPC, console, Q*/

var invalidRemote = {
    postMessage: function () {}
}, validDefaultRemote = {
    addEventListener: function () {},
    postMessage     : function () {}
}, validCustomRemote = {
    listen : function () {

    }, post: function () {

    }
}, customDesc = {
    listen: 'listen',
    post  : 'post'
};

describe('the js-rpc object is initialized with a \'remote\' object, like a worker, or a socket.io connection', function () {
    'use strict';

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
            postMessage     : function () {}
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
    'use strict';
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
});

describe('the rpc object has a public setPromiseLib function that allows for a promise interface', function () {
    'use strict';
    var rpc;
    beforeEach(function () {
        rpc = new RPC(validDefaultRemote);
    });

    it('should have an isReady method', function () {
        expect(typeof rpc.setPromiseLib).toBe('function');
    });

    it('should throw given an invalid promise lib', function () {
        var fp = []; fp.push({});
        fp.push({ defer: function () {} });
        fp.push({ defer: function () { return {}; } });
        fp.push({ defer: function () { return { reject: function () {} }; } });
        fp.push({ defer: function () { return { resolve: function () {} }; } });
        fp.push({ defer: function () { return { resolve: function () {}, reject: function () {} }; } });
        fp.push({ defer: function () { return {
            resolve: function () {},
            reject: function () {},
            promise: {}
        }; } });

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

describe('there should be a unique id function', function () {
    'use strict';
    var rpc;
    beforeEach(function () {
        rpc = new RPC(validDefaultRemote);
    });

    it('should have a function called uid', function () {
        expect(typeof rpc.uid).toBe('function');
    });

    it('should generate unique ids', function () {
        var i, cur, last = 0;

        for (i = 0; i < 10000; i += 1) {
            cur = rpc.uid();
            expect(last === cur).toBe(false);
            last = cur;
        }
    });
});

describe('the rpc object should be able to handle string messages without failing', function () {
    'use strict';
    var rpcA, rpcB, listenersA = [], listenersB = [];
    beforeEach(function () {
        listenersA = [];
        listenersB = [];

        rpcA = new RPC(
        {
            addEventListener: function (fn) {
                if (typeof fn !== 'function') {
                    console.warn('wrong type of listener');
                    return;
                }
                listenersA.push(fn);
            },
            postMessage     : function (data) {
                listenersB.forEach(function (fn) {
                    fn(data);
                });
            }
        });

        rpcB = new RPC(
        {
            addEventListener: function (fn) {
                if (typeof fn !== 'function') {
                    console.warn('wrong type of listener');
                    return;
                }
                listenersB.push(fn);
            },
            postMessage     : function (data) {
                console.log('invoking a listeners', data);
                listenersA.forEach(function (fn) {
                    fn(data);
                });
            }
        });
    });

    it('should be able to handle junk messages wihthout throwing', function () {
        expect(function () {
            rpcA.post('{sdfs', 2352, NaN, window);
        }).not.toThrow();
    });
});

describe('the rpc object has public error function that sends an error over the \'wire\'', function () {
    'use strict';
    var rpc, rpcA, rpcB, listenersA = [], listenersB = [], result;
    beforeEach(function () {
        listenersA = [];
        listenersB = [];
        rpc = new RPC(
        {
            addEventListener: function () {},
            postMessage     : function (data) {
                result = JSON.parse(data);
                if (result.error) { result = result.error; }
            }
        });

        rpcA = new RPC(
        {
            addEventListener: function (fn) {
                if (typeof fn !== 'function') {
                    console.warn('wrong type of listener');
                    return;
                }
                listenersA.push(fn);
            },
            postMessage     : function (data) {
                listenersB.forEach(function (fn) {
                    fn(data);
                });
            }
        });

        rpcB = new RPC(
        {
            addEventListener: function (fn) {
                if (typeof fn !== 'function') {
                    console.warn('wrong type of listener');
                    return;
                }
                listenersB.push(fn);
            },
            postMessage     : function (data) {
                console.log('invoking a listeners', data);
                listenersA.forEach(function (fn) {
                    fn(data);
                });
            }
        });
    });

    it('should have an error method', function () {
        expect(typeof rpc.error).toBe('function');
    });

    it('should send errors over the \'wire\'', function () {
        var msg = 'silly rabit tricks are for kids';
        rpc.error(msg);
        expect(result[0]).toBe(msg);
    });

    it ('should use its own logger to note an error if error JSONing fails', function () {
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
    'use strict';
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
            log   : function () {},
            info  : function () {},
            assert: function () {},
            warn  : function () {},
            error : function () {}
        })).toBe(true);

    });

    it('should return false given an invalid logger', function () {
        expect(rpc.setLogger()).toBe(false);
        expect(rpc.setLogger(
        {
            log   : function () {},
            info  : function () {},
            assert: function () {},
            warn  : function () {}
        })).toBe(false);
        expect(rpc.setLogger(
        {
            log   : function () {},
            info  : function () {},
            assert: function () {}
        })).toBe(false);
        expect(rpc.setLogger(
        {
            log : function () {},
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
    'use strict';
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
});

describe('the rpc object should correctly handle its expected dialect', function () {
    'use strict';
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
        listenersA = [];
        listenersB = [];
        errorTest = { error: false }

        rpcA = new RPC(
        {
            addEventListener: function (fn) {
                if (typeof fn !== 'function') {
                    console.warn('wrong type of listener');
                    return;
                }
                listenersA.push(fn);
            },
            postMessage     : function (data) {
                listenersB.forEach(function (fn) {
                    fn(data);
                });
            }
        });

        rpcB = new RPC(
        {
            addEventListener: function (fn) {
                if (typeof fn !== 'function') {
                    console.warn('wrong type of listener');
                    return;
                }
                listenersB.push(fn);
            },
            postMessage     : function (data) {
                listenersA.forEach(function (fn) {
                    fn(data);
                });
            }
        });
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

    describe('invoke', function () {});
    describe('listen', function () {});
    describe('ignore', function () {});
    describe('promise', function () {});
    describe('callback', function () {});
    describe('expose', function () {});
});