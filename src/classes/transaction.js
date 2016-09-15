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

import { VersionChangeDatabase } from './database';
import ObjectStore, { VersionChangeObjectStore } from './object-store';
import SyncPromise from './sync-promise';
import { rejectWithError } from '../util';

/**
 * A wrapper around IDBTransaction, which provides access to other wrapped APIs.
 */
class BaseTransaction {
  /**
   * @param {!IDBTransaction} transaction
   */
  constructor(transaction) {
    /** @const */
    this._transaction = transaction;

    /**
     * The access mode the transaction runs in.
     * @see https://www.w3.org/TR/IndexedDB/#idl-def-IDBTransactionMode
     *
     * @const {!IDBTransactionMode}
     */
    this.mode = transaction.mode;

    /**
     * The names of all the objectStores the transaction may access.
     *
     * @type {!DOMStringList}
     */
    this.objectStoreNames = transaction.objectStoreNames;
  }

  /**
   * A proxy to the database's `onabort` property, which handles an `abort`
   * event.
   *
   * @return {EventHandler}
   */
  get onabort() {
    return this._transaction.onabort;
  }

  /**
   * A proxy to set the database's `onabort` property, which handles an `abort`
   * event.
   *
   * @param {EventHandler} handler
   */
  set onabort(handler) {
    this._transaction.onabort = handler;
  }

  /**
   * Aborts the transaction, rolling back any changes that have happened.
   */
  abort() {
    this._transaction.abort();
  }
}


export default class Transaction extends BaseTransaction {
  /**
   * @param {!IDBTransaction} transaction
   * @param {!Database} db The database that opened the transaction.
   */
  constructor(transaction, db) {
    super(transaction);

    /** @const */
    this.db = db;

    /**
     * Whether this transaction has run. We limit the transaction to only
     * "running" once inside a `#run` callback to provide a clear indication
     * that transactions **will** close if there is no work currently being
     * done. Any attempts to access objectStores or double-run will result in
     * errors.
     */
    this._ran = this.mode === 'versionchange';

    /**
     * A promise that will only resolve when the transaction has finished all
     * work.
     *
     * @const
     * @type {!SyncPromise<undefined>}
     **/
    this._promise = new SyncPromise((resolve, reject) => {
      transaction.oncomplete = () => {
        this._ran = true;
        resolve();
      };
      transaction.onerror = rejectWithError(reject);
    });
  }

  /**
   * Opens the objectStore `name`.
   *
   * @param {string} name
   * @return {!ObjectStore} A wrapped IDBObjectStore.
   * @throws {Error} If attempting to access the objectStore outside of the ru     block. An exception is made if the transaction is the automatically run
   *     `versionchange`.
   */
  objectStore(name) {
    if (!this._ran) {
      throw new Error('Cannot access objectStore outside of the #run block.');
    }
    return new ObjectStore(this._transaction.objectStore(name), this);
  }

  /**
   * Opens a "run" block, allowing access to the transaction's objectStores.
   * The Promise-like returned will wait for both the transaction to complete
   * and the `callback`'s result before resolving with the result.
   *
   * @param {function(!Transaction):T} callback
   * @return {SyncPromise<T>} A Promise-like that will resolve with the
   *     `callback`'s result after the transaction completes.
   * @throws {Error} If called a second time. This is to clearly demonstrate
   *     that transactions will close automatically if there is no work to be
   *     done.
   * @template T
   */
  run(callback) {
    if (this._ran) {
      throw new Error('Transaction has already run.');
    }
    this._ran = true;

    return new SyncPromise((resolve) => {
      resolve(callback(this));
    }).then((result) => {
      // Wait until the transaction completes, but return the callback's
      // resolved result.
      return this._promise.then(() => result);
    }, (error) => {
      // When an error is thrown, abort the transaction.
      this.abort();
      throw error;
    });
  }
}


export class VersionChangeTransaction extends BaseTransaction {
  /**
   * @param {!IDBTransaction} transaction
   */
  constructor(transaction) {
    super(transaction);

    /** @const {!VersionChangeDatabase} */
    this.db = new VersionChangeDatabase(transaction.db, this);
  }

  /**
   * Opens the objectStore `name`.
   *
   * @param {string} name
   * @return {!VersionChangeObjectStore} A wrapped IDBObjectStore.
   */
  objectStore(name) {
    return new VersionChangeObjectStore(this._transaction.objectStore(name), this);
  }
}
