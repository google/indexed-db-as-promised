/**
 * Copyright 2015 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export default class SyncPromise {
  constructor(resolver) {
    if (!isFunction(resolver)) {
      throw new TypeError('Must pass resolver function');
    }

    this._state = PendingPromise;
    this._value = [];

    doResolve(
      this,
      adopter(this, FulfilledPromise),
      adopter(this, RejectedPromise),
      { then: resolver }
    );
  }

  then(onFulfilled, onRejected) {
    onFulfilled = isFunction(onFulfilled) ? onFulfilled : returner;
    onRejected = isFunction(onRejected) ? onRejected : thrower;
    return this._state(this._value, onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.then(void 0, onRejected);
  }

  static resolve(value) {
    if (isObject(value) && value instanceof SyncPromise) {
      return value;
    }

    return new SyncPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new SyncPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new SyncPromise((resolve, reject) => {
      let count = promises.length;
      const values = new Array(count);

      if (count == 0) {
        resolve(values);
        return;
      }

      for (let i = 0; i < promises.length; i++) {
        SyncPromise.resolve(promise).then((value) => {
          values[i] = value;
          if (--count == 0) {
            resolve(values);
          }
        }, reject);
      }
    });
  }

  static race(promises) {
    return new SyncPromise((resolve, reject) => {
      for (let i = 0; i < promises.length; i++) {
        SyncPromise.resolve(promises[i]).then(resolve, reject);
      }
    });
  }
}

function PromiseState(action) {
  return function(value, onFulfilled, onRejected, deferred) {
    if (!deferred) {
      deferred = Deferred();
    }
    action(value, onFulfilled, onRejected, deferred);
    return deferred._promise;
  }
}

const FulfilledPromise = PromiseState((value, onFulfilled, _, deferred) => {
  tryCatchDeferred(deferred, onFulfilled, value);
});

const RejectedPromise = PromiseState((reason, _, onRejected, deferred) => {
  tryCatchDeferred(deferred, onRejected, reason);
});

const PendingPromise = PromiseState((queue, onFulfilled, onRejected, deferred) => {
  queue.push({
    _deferred: deferred,
    _onFulfilled: onFulfilled,
    _onRejected: onRejected,
  });
});

function Deferred() {
  const deferred = {};
  deferred._promise = new SyncPromise((resolve, reject) => {
    deferred._resolve = resolve;
    deferred._reject = reject;
  });
  return deferred;
}

function adopt(promise, state, value) {
  const queue = promise._value;
  promise._state = state;
  promise._value = value;

  for (let i = 0; i < queue.length; i++) {
    const { _deferred, _onFulfilled, _onRejected } = queue[i];
    state(value, _onFulfilled, _onRejected, _deferred);
  }
}

function adopter(promise, state) {
  return (value) => adopt(promise, state, value);
}

function noop() {}

function returner(x) {
  return x;
}

function thrower(x) {
  throw x;
}

function isFunction(fn) {
  return typeof fn == 'function';
}

function isObject(obj) {
  return obj == Object(obj);
}

function tryCatchDeferred(deferred, fn, arg) {
  const { _promise, _resolve, _reject } = deferred;
  try {
    const result = fn(arg);
    doResolve(_promise, _resolve, _reject, result, result);
  } catch (e) {
    _reject(e);
  }
}

function doResolve(promise, resolve, reject, value, context) {
  let called = false;
  try {
    if (value == promise) {
      throw new TypeError('Cannot fulfill promise with itself');
    }
    let then;
    let isObj = isObject(value);
    if (isObj && value instanceof SyncPromise) {
      adopt(promise, value._state, value._value);
    } else if (isObj && (then = value.then) && isFunction(then)) {
      then.call(context, (value) => {
        if (!called) {
          called = true;
          doResolve(promise, resolve, reject, value, value);
        }
      }, (reason) => {
        if (!called) {
          called = true;
          reject(reason);
        }
      });
    } else {
      resolve(value);
    }
  } catch (reason) {
    if (!called) {
      called = true;
      reject(reason);
    }
  }
}
