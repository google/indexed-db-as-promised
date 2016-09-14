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

import Request from './request';
import CursorRequest from './cursor';
import Index from './index';

/**
 * A wrapper around IDBObjectStore, which provides a thin Promise-like API.
 */
export default class ObjectStore {
  /**
   * @param {!IDBObjectStore} store
   * @param {!Transaction} transaction The transaction that is accessing the
   *     objectStore.
   */
  constructor(store, transaction) {
    /** @const */
    this._store = store;

    /** @const */
    this.transaction = transaction;

    /** @const {string} */
    this.name = store.name;

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

    /**
     * The key path of the records records in the objectStore.
     *
     * @const {*}
     */
    this.keyPath = store.keyPath;
  }

  /**
   * Adds the record to the objectStore.
   *
   * @param {*} record The record to add.
   * @param {IDBKeyType=} The key to associate the record with.
   * @return {!Request<IDBKeyType>} A wrapped IDBRequest to add the record.
   */
  add(record, key = undefined) {
    return new Request(this._store.add(record, key), this.transaction, this);
  }

  /**
   * Clears all records from the objectStore.
   *
   * @return {!Request<undefined>} A wrapped IDBRequest to clear all records.
   */
  clear() {
    return new Request(this._store.clear(), this.transaction, this);
  }

  /**
   * Counts the number of records in the objectStore. An optional query may be
   * provided to limit the count to only records matching it.
   *
   * @param {*=} query The key of the records to count, or an IDBKeyRange of the
   *     keys to count.
   * @return {!Request<number>}
   */
  count(query = null) {
    return new Request(
      query == null ? this._store.count() : this._store.count(query),
      this.transaction,
      this
    );
  }

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
    const index = this._store.createIndex(name, keyPath, params);
    this.indexNames = this._store.indexNames;
    return new Index(index, this.transaction, this);
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
    return new Request(this._store.delete(key), this.transaction, this);
  }

  /**
   * Deletes the index `name` on the objectStore.  Note that this may only be
   * called inside the `upgrade` handler provided to `IndexedDBP#open`.
   *
   * @param {string} name
   */
  deleteIndex(name) {
    this._store.deleteIndex(name);
    this.indexNames = this._store.indexNames;
  }

  /**
   * Gets the record in the objectStore that matches `key`, or the first record
   * that matches the key range.
   *
   * @param {*=} key The key of the record to get, or an IDBKeyRange of the
   *     keys.
   * @return {!Request<*>}
   */
  get(key) {
    return new Request(this._store.get(key), this.transaction, this);
  }

  /**
   * Gets all the records in the objectStore that matches `key` or that match
   * the key range. Note that not all implementations of IndexedDB provide
   * `IDBObjectStore#getAll`.
   *
   * @param {*=} query The key of the records to get, or an IDBKeyRange of the
   *     keys.
   * @param {number=} count The maximum number of records to return.
   * @return {!Request<!Array<*>>}
   */
  getAll(query = null, count = Infinity) {
    return new Request(this._store.getAll(query, count), this.transaction, this);
  }

  /**
   * Gets all the keys of the records in the objectStore that matches `key` or
   * that match the key range. Note that not all implementations of IndexedDB
   * provide `IDBObjectStore#getAllKeys`.
   *
   * @param {*=} query The key to get, or an IDBKeyRange of the keys.
   * @param {number=} count The maximum number of keys to return.
   * @return {!Request<!Array<*>>}
   */
  getAllKeys(query = null, count = Infinity) {
    return new Request(this._store.getAllKeys(query, count), this.transaction, this);
  }

  /**
   * Opens the index `name` on the objectStore.
   *
   * @return {!Index} A wrapped IDBIndex
   */
  index(name) {
    return new Index(this._store.index(name), this.transaction, this);
  }

  /**
   * Opens a cursor to iterate all records in the objectStore, or those matched
   * by `query`.
   *
   * @param {*=} query The key to iterate, or an IDBKeyRange of the keys.
   * @param {./cursor.Direction=} The direction to iterate in.
   * @return {!CursorRequest} A wrapper around an iterating IDBCursor.
   */
  openCursor(query = null, direction = 'next') {
    return new CursorRequest(this._store.openCursor(query, direction), this.transaction, this);
  }

  /**
   * Opens a cursor to iterate all keys in the objectStore, or those matched by
   * `query`.
   *
   * @param {*=} query The key to iterate, or an IDBKeyRange of the keys.
   * @param {./cursor.Direction=} The direction to iterate in.
   * @return {!CursorRequest} A wrapper around an iterating IDBCursor.
   */
  openKeyCursor(query = null, direction = 'next') {
    return new CursorRequest(this._store.openKeyCursor(query, direction), this.transaction, this);
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
    return new Request(this._store.put(record, key), this.transaction, this);
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
    const index = this._store.createIndex(name, keyPath, params);
    this.indexNames = this._store.indexNames;
    return new Index(index, this.transaction, this);
  }

  /**
   * Deletes the index `name` on the objectStore.  Note that this may only be
   * called inside the `upgrade` handler provided to `IndexedDBP#open`.
   *
   * @param {string} name
   */
  deleteIndex(name) {
    this._store.deleteIndex(name);
    this.indexNames = this._store.indexNames;
  }
}
