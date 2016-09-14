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

/**
 * A wrapper around IDBIndex, which provides a thin Promise-like API.
 */
export default class Index {
  /**
   * @param {!IDBIndex} index
   * @param {!Transaction} transaction The transaction that opened this index
   * @param {!ObjectStore} objectStore the ObjectStore this index belongs to.
   */
  constructor(index, transaction, objectStore) {
    /** @const */
    this._index = index;

    /** @const */
    this._transaction = transaction;

    /** @const */
    this.objectStore = objectStore;

    /** @const {string} */
    this.name = index.name;

    /**
     * The key path that populates records into the index.
     * @const {*}
     **/
    this.keyPath = index.keyPath;

    /**
     * Whether there will be multiple entries for a record when the keyPath is an
     * array. When `multiEntry` is `true` there is one record for every record in
     * `keyPath`, when false there is only one record for the entire `keyPath`.
     *
     * @const {boolean}
     */
    this.multiEntry = index.multiEntry;

    /**
     * Whether the index limits itself to unique keys only.
     *
     * @const {boolean}
     */
    this.unique = index.unique;
  }

  /**
   * Counts the number of records in the index. An optional query may be
   * provided to limit the count to only records matching it.
   *
   * @param {*=} query The key of the records to count, or an IDBKeyRange of the
   *     keys to count.
   * @return {!Request<number>}
   */
  count(query = null) {
    return new Request(
      query == null ? this._index.count() : this._index.count(query),
      this._transaction,
      this
    );
  }

  /**
   * Gets the record in the index that matches `key`, or the first record that
   * matches the key range.
   *
   * @param {*=} key The key of the record to get, or an IDBKeyRange of the
   *     keys.
   * @return {!Request<*>}
   */
  get(key) {
    return new Request(this._index.get(key), this._transaction, this);
  }

  /**
   * Gets all the records in the index that matches `key` or that match the key
   * range. Note that not all implementations of IndexedDB provide
   * `IDBIndex#getAll`.
   *
   * @param {*=} query The key of the records to get, or an IDBKeyRange of the
   *     keys.
   * @param {number=} count The maximum number of records to return.
   * @return {!Request<!Array<*>>}
   */
  getAll(query = null, count = Infinity) {
    return new Request(this._index.getAll(query, count), this._transaction, this);
  }

  /**
   * Gets all the keys of the records in the index that matches `key` or that
   * match the key range. Note that not all implementations of IndexedDB
   * provide `IDBIndex#getAllKeys`.
   *
   * @param {*=} query The key to get, or an IDBKeyRange of the keys.
   * @param {number=} count The maximum number of keys to return.
   * @return {!Request<!Array<*>>}
   */
  getAllKeys(query = null, count = Infinity) {
    return new Request(this._index.getAllKeys(query, count), this._transaction, this);
  }

  /**
   * Opens a cursor to iterate all records in the index, or those matched by `query`.
   *
   * @param {*=} query The key to iterate, or an IDBKeyRange of the keys.
   * @param {./cursor.Direction=} The direction to iterate in.
   * @return {!CursorRequest} A wrapper around an iterating IDBCursor.
   */
  openCursor(query = null, direction = 'next') {
    return new CursorRequest(this._index.openCursor(query, direction), this._transaction, this);
  }

  /**
   * Opens a cursor to iterate all keys in the index, or those matched by `query`.
   *
   * @param {*=} query The key to iterate, or an IDBKeyRange of the keys.
   * @param {./cursor.Direction=} The direction to iterate in.
   * @return {!CursorRequest} A wrapper around an iterating IDBCursor.
   */
  openKeyCursor(query = null, direction = 'next') {
    return new CursorRequest(this._index.openKeyCursor(query, direction), this._transaction, this);
  }
}
