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

import SyncPromise from './sync-promise';
import Request from './request';

/**
 * The direction of cursor iteration.
 * @see https://www.w3.org/TR/IndexedDB/#idl-def-IDBCursorDirection
 *
 * @enum {string}
 */
export const Direction = {
  NEXT: "next",
  NEXT_UNIQUE: "nextunique",
  PREV: "prev",
  PREV_UNIQUE: "prevunique",
};

/**
 * A wrapper around IDBCursor, which provides a thin promise-like API over the
 * cursor's iteration.
 */
class Cursor {
  /**
   * @param {!IDBCursor} cursor
   * @param {!Transaction} transaction The wrapped IDBTransaction that opened
   *     this cursor.
   * @param {!ObjectStore|!Index} source A source that opened this cursor,
   *     either a wrapped IDBObjectStore or a wrapped IDBIndex.
   */
  constructor(cursor, transaction, source) {
    /** @const */
    this.transaction = transaction;

    /** @const */
    this.source = source;

    /** @const */
    this._cursor = cursor;

    /**
     * The direction of iteration for this cursor.
     * @const {!Direction}
     */
    this.direction = cursor.direction;

    /**
     * The key of the record at the cursor's current position. If the source of
     * he cursor is an Index, it is the value at `keyPath` of the Index.
     * Otherwise, it is the primary key stored by the ObjectStore.
     * @type {IDBKeyType}
     */
    this.key = null;

    /**
     * The primary key of the record at the cursor's current position in the
     * ObjectStore.
     *
     * @type {IDBKeyType}
     */
    this.primaryKey = null;

    /**
     * The record at the cursor's current position.
     *
     * @type {*}
     */
    this.value =  null;
  }

  /**
   * Advances the cursor `count` iterations, skipping the records.
   *
   * @param {number} count A number positive number to advance by.
   */
  advance(count) {
    this._cursor.advance(count);
  }

  /**
   * Advances the cursor to the next record. If the optional `key` is provided,
   * the cursor continues to advance until the current record's key matches or
   * there is nothing left to iterate.
   *
   * @param {IDBKeyType=} key
   */
  continue(key = null) {
    if (key == null) {
      this._cursor.continue();
    } else {
      this._cursor.continue(key);
    }
  }

  /**
   * Deletes the record at the cursor's current position. Note that this does
   * not advance the position of the cursor. Once complete, the cursor's value
   * will be `null`.
   *
   * @return {!Request<undefined>} A wrapped IDBRequest to delete the current
   *     record.
   */
  delete() {
    return new Request(this._cursor.delete(), this.transaction, this);
  }

  /**
   * Updates the record at the cursor's current position.
   *
   * @param {*} value
   * @return {!Request<IDBKeyType>} A wrapped IDBRequest to update the current
   *     record.
   */
  update(value) {
    return new Request(this._cursor.update(value), this.transaction, this);
  }
}

/**
 * Wraps the actual IDBCursor, managing its request phase.
 */
export default class CursorRequest {
  /**
   * @param {!IDBRequest} The request to open the IDBCursor.
   * @param {!Transaction} transaction The wrapped IDBTransaction that opened
   *     the cursor.
   * @param {!ObjectStore|!Index} source A source that opened the cursor, either
   *     a wrapped IDBObjectStore or a wrapped IDBIndex.
   */
  constructor(cursorRequest, transaction, source) {
    /** @const */
    this.transaction = transaction;

    /** @const */
    this.source = source;

    /** @const */
    this._cursorRequest = cursorRequest;

    /**
     * A promise which resolves to the cursor at the cursor's current position.
     * This promise is continually overridden after each iteration, to reflect
     * the pending request to advance to the next position of the cursor.
     *
     * @type {!Request<IDBCursor>}
     */
    this._promise = new Request(cursorRequest, this, source);
  }

  /**
   * Iterates the cursor, calling `iterator` every time the cursor advances to
   * a new record. The iterator is responsible for explicitly calling either
   * `Cursor#continue` or `Cursor#advance` to advance the cursor, else the
   * iteration will end.
   *
   * @param {!function(!Cursor):*} iterator
   * @return {!SyncPromise<Array<*>>} A Promise-like that will resolve to the
   *     values returned from `iterator` at every iteration.
   */
  iterate(iterator) {
    return this._promise.then((result) => {
      const results = [];
      const request = this._cursorRequest;

      // Avoid the rest if the cursor is out of bounds.
      if (!result) {
        return results;
      }

      const cursor = new Cursor(result, this.transaction, this.source);

      /**
       * The first step of the iteration process ensures that we wait until the
       * result returned from `iterator` resolves before continuing iteration.
       * This callback is passed as the resolver to SyncPromise's constructor.
       * @param {function(*=)} resolve The promise resolve function.
       */
      const iterate = (resolve) => {
        resolve(iterator(cursor));
      };

      /**
       * The next step of the iteration process, this stores the `iterator`'s
       * resolved value and creates a new Request if the cursor advanced.
       * @param {*} result
       * @return {!Request<IDBCursor>|null}
       */
      const pushAndMaybeAdvance = (result) => {
        results.push(result);

        // If the cursor did not advance, we assume that further iteration is
        // no longer desired. In that case, break early (avoiding another
        // Request instance) and allow the final call to `iterate` to return
        // the results.
        if (request.readyState === 'done') {
          return null;
        }

        // Update our request promise to reflect that we're waiting for the
        // cursor to advance.
        const next = new Request(request, this.transaction, this.source);
        return (this._promise = next);
      };

      /**
       * A recursive callback that will continue to call `iterator` until there
       * is nothing left to iterate. Holy smokes, look at the recursion Batman!
       * @param {*|null} result
       * @return {!SyncPromise<!Array<*>>|!Array<*>}
       */
      const step = (result) => {
        // When the cursor finally reaches the end of its bounds, the Request
        // will resolve with `null`.
        if (!result) {
          return results;
        }

        cursor.key = result.key;
        cursor.primaryKey = result.primaryKey;
        cursor.value = result.value;
        return new SyncPromise(iterate)
          .then(pushAndMaybeAdvance)
          .then(step);
      };

      return step(result);
    });
  }

  /**
   * Iterates the cursor, calling `iterator` ever time the cursor advances to a
   * new record. The iterator may optionally advance the cursor. If it does
   * not, the cursor will be automatically advanced to the next record as long
   * as the iterator's result is not `false` (which signals that iteration
   * should stop). If you wish to continue iteration _and_ return `false`, you
   * must manually advance the cursor.
   *
   * @param {!function(!Cursor):*} iterator
   * @return {!SyncPromise<Array<*>>} A Promise-like that will resolve to the
   *     values returned from `iterator` at every iteration.
   */
  while(iterator) {
    // If false is returned (and the cursor was not manually advanced), we set
    // the preempt flag to signal that the last result (the `false` value)
    // should be removed from the resulting array.
    let preempt = false;

    /**
     * The Cursor instance that `#iterate` passes to `iterator`, hoisted so
     * that we may also hoist `autoAdvancer`.
     * @type {?Cursor}
     */
    let cursor;

    /**
     * We wrap our iterator, calling `Cursor#continue` if the cursor is not
     * manually advanced and `result` is not `false`.
     * @param {*|false} result
     * @return {*}
     */
    const autoAdvancer = (result) => {
      if (this._cursorRequest.readyState === 'done') {
        if (result === false) {
          preempt = true;
        } else {
          cursor.continue();
        }
      }

      return result;
    };

    return this.iterate((c) => {
      cursor = c;
      return SyncPromise.resolve(iterator(cursor))
        .then(autoAdvancer);
    }).then((results) => {
      // If we preempted iteration (by returning `false` and not manually
      // advancing the cursor), we need to remove that final `false` value from
      // the resolved results.
      if (preempt) {
        results.pop();
      }

      return results;
    });
  }
}
