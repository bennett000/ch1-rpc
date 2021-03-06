/**
 * Main module "really ties the project together"
 */
import {
  createUidGenerator,
  isObject,
  pnoop,
  typeError,
  safeInvoke,
  throwIfNotFunction,
} from './utils';
import { create as createRemote, createRemoteDescFrom } from './remote';
import * as nOp from './response';

import {
  Remote,
  RemoteDesc,
  RPC,
  RPCAsyncContainerDictionary,
  RPCConfig,
  RPCEventRegistry,
} from './interfaces';

import {
  DEFAULT_ASYNC_TYPE,
  DEFAULT_MESSAGE,
  DEFAULT_CREATE_RETRY,
  DEFAULT_CREATE_RETRY_CURVE,
  DEFAULT_CREATE_WAIT,
} from './constants';

/**
 * Where `RemoteType` is the description of the interface you _expect_ to be
 * exposed *by the "other side"*
 * @param config
 * @param remote optional remote to expose *on the "other side"*
 */
export function create<RemoteType>(
  config: RPCConfig,
  remote?: Remote<any>,
  remoteDesc?: RemoteDesc,
): RPC<RemoteType> {
  remote = validateRemote(remote);
  config = validateConfig(config, remote);

  const onDestroyDict = Object.create(null);
  const local: RemoteType = Object.create(null);
  const { callbacks } = config;
  const combinedDesc = createRemoteDescFrom(config, remote, remoteDesc);
  let destroy: () => Promise<void> = pnoop;

  const isReady = nOp
    .create(config, callbacks, combinedDesc)
    .then(network => {
      createRemote<RemoteType>(config, callbacks, network.remoteDesc, local);
      destroy = network.off;
    });

  return <RPC<RemoteType>>{
    config,
    destroy: (reason = '') => {
      Object.keys(local).forEach(key => delete local[key]);
      flushCallbacks(callbacks, config.functionalState.errorHandlers, reason);
      return destroy().then(() => {
        destroy = pnoop;
        Object.keys(onDestroyDict).forEach(key => {
          safeInvoke(onDestroyDict[key], [reason]);
          delete onDestroyDict[key];
        });
      });
    },
    onDestroy: (callback: (reason?: string) => any) => {
      const id =
        Date.now().toString(32) +
        Math.floor(Math.random() * 50000).toString(32);
      onDestroyDict[id] = callback;

      return () => {
        delete onDestroyDict[id];
      };
    },
    ready: isReady,
    remote: local,
  };
}

export function flushCallbacks(
  callbacks: RPCAsyncContainerDictionary,
  errorHandlers: RPCEventRegistry,
  reason = '',
) {
  Object.keys(callbacks).forEach(id => {
    const cb = callbacks[id];

    errorHandlers[cb.type]
      ? errorHandlers[cb.type](cb.async, new Error('rpc flush ' + reason))
      : console.warn(
          'rpc: flush: no error handler registered for ' + cb.type,
        );

    delete callbacks[id];
  });
}

export function validateRemote(r: Object): Remote<any> {
  r = r || Object.create(null);

  if (!isObject(r)) {
    typeError('validateRemote: remote must be an object');
  }

  return <Remote<any>>r;
}

export function validateConfig(c: RPCConfig, remote: Remote<any>): RPCConfig {
  throwIfNotFunction(c.on, 'validateConfig: config requires an on method');
  throwIfNotFunction(
    c.emit,
    'validateConfig: config requires an emit method',
  );

  c.defaultAsyncType = c.defaultAsyncType || DEFAULT_ASYNC_TYPE;
  c.defaultCreateRetry = c.defaultCreateRetry || DEFAULT_CREATE_RETRY;
  c.defaultCreateRetryCurve =
    c.defaultCreateRetryCurve || DEFAULT_CREATE_RETRY_CURVE;
  c.defaultCreateWait = c.defaultCreateWait || DEFAULT_CREATE_WAIT;
  c.enableStackTrace = c.enableStackTrace || false;
  c.functionalState = nOp.createFunctionalState();
  c.callbacks = Object.create(null);
  c.maxAckDelay = c.maxAckDelay || 5000;
  c.message = c.message || DEFAULT_MESSAGE;

  c.uid = createUidGenerator();

  c.useAcks = c.useAcks ? Object.create(null) : null;
  c.remote = remote;

  return Object.freeze(c);
}

export function extend() {}
