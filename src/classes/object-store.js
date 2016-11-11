/**
 * Copyright 2016 Google Inc.
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

import DataSource from './data-source';
import Request from './request';
import Index from './index';

/**
 * A wrapper around IDBObjectStore, which provides a thin Promise-like API.
 */
export default class ObjectStore extends DataSource {
  /**
   * @param {!IDBObjectStore} store
   * @param {!Transaction} transaction The transaction that is accessing the
   *     objectStore.
   */
  constructor(store, transaction) {
    super(store, transaction);

    /** @const */
    this.transaction = transaction;

    /**
     * Whether the objectStore uses an auto incrementing key if a key is not
     * provided.
     *
     * @const {boolean}
     */
    this.autoIncrement = store.autoIncrement;

    /**
     * The names of all the indexes on the objectStore.
     *
     * @type {!DOMStringList}
     */
    this.indexNames = store.indexNames;
  }

  /**
   * Adds the record to the objectStore.
   *
   * @param {*} record The record to add.
   * @param {IDBKeyType=} The key to associate the record with.
   * @return {!Request<IDBKeyType>} A wrapped IDBRequest to add the record.
   */
  add(record, key = undefined) {
    return new Request(this._source.add(record, key), this.transaction, this);
  }

  /**
   * Clears all records from the objectStore.
   *
   * @return {!Request<undefined>} A wrapped IDBRequest to clear all records.
   */
  clear() {
    return new Request(this._source.clear(), this.transaction, this);
  }

  /**
   * Deletes the record that matches `key`, or the first record that matches
   * the key range.
   *
   * @param {IDBKeyType} key The key of the record to get, or an IDBKeyRange of
   *     the keys.
   * @return {!Request<undefined>} A wrapped IDBRequest to delete the record.
   */
  delete(key) {
    return new Request(this._source.delete(key), this.transaction, this);
  }

  /**
   * Opens the index `name` on the objectStore.
   *
   * @return {!Index} A wrapped IDBIndex
   */
  index(name) {
    return new Index(this._source.index(name), this.transaction, this);
  }

  /**
   * Adds the record to the objectStore, or updates the record already stored.
   *
   * @param {*} record The record to add.
   * @param {IDBKeyType=} The key to associate the record with.
   * @return {!Request<IDBKeyType>} A wrapped IDBRequest to add or update the
   *     record.
   */
  put(record, key = undefined) {
    return new Request(this._source.put(record, key), this.transaction, this);
  }
}


export class VersionChangeObjectStore extends ObjectStore {
  /**
   * Creates an index `name` on the objectStore.  Note that this may only be
   * called inside the `upgrade` handler provided to `IndexedDBP#open`.
   *
   * @param {string} name
   * @param {IDBIndexParameters=} Options to use when creating the index, such
   *     as `multiEntry` and `unique`.
   *     @see https://www.w3.org/TR/IndexedDB/#idl-def-IDBIndexParameters
   * @return {!Index} A wrapped IDBIndex
   */
  createIndex(name, keyPath, params = {}) {
    const index = this._source.createIndex(name, keyPath, params);
    this.indexNames = this._source.indexNames;
    return new Index(index, this.transaction, this);
  }

  /**
   * Deletes the index `name` on the objectStore.  Note that this may only be
   * called inside the `upgrade` handler provided to `IndexedDBP#open`.
   *
   * @param {string} name
   */
  deleteIndex(name) {
    this._source.deleteIndex(name);
    this.indexNames = this._source.indexNames;
  }
}
