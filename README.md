# CH1 RPC

[![CircleCI](https://circleci.com/gh/bennett000/ch1-rpc.svg?style=svg)](https://circleci.com/gh/bennett000/ch1-rpc)

_This is not well maintained_

_This is not traditional RPC, but it is like it_

## Installation

`yarn add @ch1/rpc`

## Usage

Convenient usage would be to use another library that consumes this library. Two examples are:

- [@ch1/rpc-worker](https://www.npmjs.com/package/@ch1/rpc-worker 'RPC Worker')
- [@ch1/rpc-web-socket](https://www.npmjs.com/package/@ch1/rpc-web-socket 'RPC Web Socket')

However this library can work over pretty much any stringifiable interface. Maybe binary one day.

### Simplest Pure JS Example

_Ideally process A/B would be literal separate processes like workers
or sockets. However the usage can be "faked" in a single process as
is done in [the tests]:(./spec/js-rpc.spec.ts "Testing Source Code")_

Process A

```js
const b = rpc.create({ /* config */}, {
  sayOnA: (arg) => console.log(`Process B says ${arg}`);
});

b.ready.then(() => b.remote.sayOnB('hello world');
// will call sayOnB on process B
```

Process B

```js
const a = rpc.create({ /* config */}, {
  sayOnB: (arg) => console.log(`Process A says ${arg}`);
});

a.ready.then(() => a.remote.sayOnA('hello world');
// will call sayOnA on process A
```

## How It Works

@ch1/rpc can work across any transport provided that the transport can be
simplified into `on` and `emit` functions.

What do we mean by `on` and `emit` functions? Let's imagine for a moment the
[Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers 'MDN: Using Web Workers')

_note: @ch1/rpc-worker contains convenience functions that provide WebWorker support out
of the box. The examples here are educational and *do not* need to be
implemented_

In our first process we might have a Web Worker:

```js
// make a new worker
const myWorker = new Worker('worker.js');

// js-rpc only wants/needs to use the first parameter of emit consequently the
// WebWorker post message can be used out of the box
const emit = myWorker.postMessage.bind(myWorker);

// js-rpc's on message wants/needs data to be its first parameter.  Since
// WebWorker.onmessage boxes passed data into an even we need to extract it
const on = myWorker.onmessage(event => event.data);

// make a RPC Object:
const worker = create({ on, emit } /* object to expose on worker process */);
```

In our second WebWorker process we have a slightly different API:

```js
// WebWorkers use a variable called "self" to register their messages:
// self.postMessage has the same api as in our previous example
const emit = self.postMessage.bind(self);

// self.onmessage also boxes data into events
const on = self.onmessage(event => event.data);

// make a RPC Object:
const parentWindow = create(
  { on, emit } /* object to expose on window process */,
);
```

## API

The `create` call kicks everything off:

```ts
// RemoteType is a user defined type meant to inform TypeScript
// what the function signatures will be of `RPC.remote`
export function create<RemoteType>(
  // The config object is more like the internal state of the system
  // There are many config options
  // This object will be changing in the future to better separate concerns
  // Relevant config options will be documented below
  config: RPCConfig,
  // The optional "remote" object _in this context_ are the functions "local"
  // to the `create` call that you wish to expose on the other side
  // of the transport (worker, server, whatever)
  remote?: Remote<any>,
  // ignore this optional argument for now
  remoteDesc?: RemoteDesc,
): RPC<RemoteType>;
```

The `RPC<RemoteType>` interface is the full object you get back from the `create` call:

```ts
export interface RPC<RemoteType> {
  // The config object is more like the internal state of the system
  // There are many config options
  // This object will be changing in the future to better separate concerns
  // Relevant config options will be documented below
  config: RPCConfig;

  // promises to free up the resources, takes an optional reason that
  // propagates through to error messages received by any pending async
  // results
  destroy: (reason?: string) => Promise<void>;

  // registers a callback and calls it in the event the object's `destroy`
  // method is called.  `onDestroy` returns a de-registration function
  onDestroy: (callback: (reason?: string) => any) => () => void;

  // this is a promise that resolves if/when the rpc system is ready
  // it will time out and fail at a configurable threshold
  ready: Promise<void>;

  // this is the object that will expose all of the remote functions
  // this object can have nested objects with functions
  remote: RemoteType;
}
```

The RPCConfig Object is vast and it will be shrinking soon. The parts that
will stay consistent are the mandatory configurations:

```ts
export interface RPCConfig {
  /*************** Required ***************/
  // the `emit` method must be defined by the user of `rpc`
  // it is what sends stuff to the worker/socket/whatever
  emit: (payload: any): any;

  // the `on` method must be defined by the user of `rpc`
  // it is what receives stuff from the worker/socket/whatever
  on: (callback: (payload: any) => any): () => any;
}
```

## License

[LGPL](./LICENSE 'Lesser GNU Public License')
