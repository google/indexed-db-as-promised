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

import ObjectStore from './object-store';
import Transaction from './transaction';

/**
 * A wrapper around IDBDatabase, which provides access to other wrapped APIs.
 */
class BaseDatabase {
  /**
   * @param {!IDBDatabase} database
   */
  constructor(database) {
    /** @const */
    this._database = database;

    /** @const {string} */
    this.name = database.name;

    /** @const {number} */
    this.version = database.version;

    /**
     * The names of all the objectStores in the database.
     *
     * @type {!DOMStringList}
     */
    this.objectStoreNames = database.objectStoreNames;
  }

  /**
   * A proxy to the database's `onabort` property, which handles an `abort`
   * event.
   *
   * @return {EventHandler}
   */
  get onabort() {
    return this._database.onabort;
  }

  /**
   * A proxy to set the database's `onabort` property, which handles an `abort`
   * event.
   *
   * @param {EventHandler} handler
   */
  set onabort(handler) {
    this._database.onabort = handler;
  }

  /**
   * A proxy to the database's `onerror` property, which handles an `error`
   * event.
   *
   * @return {EventHandler}
   */
  get onerror() {
    return this._database.onerror;
  }

  /**
   * A proxy to set the database's `onerror` property, which handles an `error`
   * event.
   *
   * @param {EventHandler} handler
   */
  set onerror(handler) {
    this._database.onerror = handler;
  }

  /**
   * A proxy to the database's `onversionchange` property, which handles the
   * `versionchange` event. Note that this is not the same as the `upgrade`
   * handler provided to `IndexedDBP#open`.
   *
   * @return {EventHandler}
   */
  get onversionchange() {
    return this._database.onversionchange;
  }

  /**
   * A proxy to set the database's `onversionchange` property, which handles
   * the `versionchange` event. Note that this is not the same as the `upgrade`
   * handler provided to `IndexedDBP#open`.
   *
   * @param {EventHandler} handler
   */
  set onversionchange(handler) {
    this._database.onversionchange = handler;
  }

  /**
   * Closes this database connection.
   */
  close() {
    this._database.close();
  }
}


export default class Database extends BaseDatabase {
  /**
   * @param {!IDBDatabase} database
   */
  constructor(database) {
    super(database)
  }

  /**
   * Opens a new transaction to read or read/write data to the specified
   * objectStores. Note that this may not be called inside the `upgrade`
   * handler provided to `IndexedDBP#open`.
   *
   * @param {string|!Array<string>} scope The objectStore(s) that may be
   *     accessed inside the transaction.
   * @param {IDBTransactionMode=} mode Limits data access to the provided mode:
   *     either `readonly` or `readwrite`.
   *     @see https://www.w3.org/TR/IndexedDB/#idl-def-IDBTransactionMode
   * @return {!Transaction} A wrapped IDBTransaction.
   */
  transaction(scope, mode = 'readonly') {
    return new Transaction(
      this._database.transaction(scope, mode),
      this
    );
  }
}


/**
 * A wrapper around IDBDatabase, which provides access to other wrapped APIs.
 */
export class VersionChangeDatabase extends BaseDatabase {
  /**
   * @param {!IDBDatabase} database
   * @param {!VersionChangeTransaction} transaction
   */
  constructor(database, transaction) {
    super(database);

    /** @const */
    this._transaction = transaction;
  }

  /**
   * Creates an objectStore. Note that this may only be called inside the
   * `upgrade` handler provided to `IndexedDBP#open`.
   *
   * @param {string} name
   * @param {IDBObjectStoreParameters=} Options to use when creating the
   *     objectStore, such as `autoIncrement`, `keyPath`.
   *     @see https://www.w3.org/TR/IndexedDB/#idl-def-IDBObjectStoreParameters
   * @return {!ObjectStore} A wrapped IDBObjectStore.
   */
  createObjectStore(name, params = {}) {
    const store = this._database.createObjectStore(name, params);
    this.objectStoreNames = this._database.objectStoreNames;
    this._transaction.objectStoreNames = this.objectStoreNames;
    return new ObjectStore(store, this._transaction);
  }

  /**
   * Deletes the `name` objectStore. Note that this may only be called inside
   * the `upgrade` handler provided to `IndexedDBP#open`.
   *
   * @param {string} name
   */
  deleteObjectStore(name) {
    this._database.deleteObjectStore(name);
    this.objectStoreNames = this._database.objectStoreNames;
    this._transaction.objectStoreNames = this.objectStoreNames;
  }
}
