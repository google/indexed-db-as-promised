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

import Request from './classes/request';
import Database from './classes/database';
import { VersionChangeTransaction } from './classes/transaction';
import SyncPromise from './classes/sync-promise';


/**
 * An event emitted during the `versionchange` transaction, containing the
 * new version, old version, and the transaction itself.
 *
 * @typedef {{
 *   oldVersion: number,
 *   newVersion: number,
 *   transaction: ?VersionChangeTransaction,
 * }}
 */
let VersionChangeEvent;

/**
 * An object which provides the `upgrade` and `blocked` callbacks to use when
 * upgrading the database's version. The `upgrade` callback's
 * `VersionChangeEvent` will contain a `VersionChangeTransaction` object, while
 * the `blocked` callback's will not.
 *
 * @typedef {{
 *   upgrade: ?function(!Database, !VersionChangeEvent),
 *   blocked: ?function(!VersionChangeEvent),
 * }}
 */
let OpenCallbacks;

/**
 * A helper to create a brand new VersionChangeEvent with an wrapped
 * Transaction.
 *
 * @param {!Event} event The native version change event emitted.
 * @param {?VersionChangeTransaction} transaction The versionchange transaction
 *     if the version is changing.
 * @return {!VersionChangeEvent}
 */
function versionChangeEvent(event, transaction = null) {
  return {
    oldVersion: event.oldVersion,
    newVersion: event.newVersion,
    transaction,
  };
}

/**
 * An IndexedDB factory instance that wraps IndexedDB in a thin promise-like
 * API.
 */
const indexedDBP = {
  /**
   * Deletes the database `name`.
   *
   * @return {!Request<undefined>} A wrapped IDBRequest to delete the database.
   */
  deleteDatabase(name) {
    return new Request(indexedDB.deleteDatabase(name));
  },

  /**
   * Opens a new connection to the database `name`, possibly upgrading the
   * database's version. Optional callbacks `upgrade` and `blocked` may be
   * provided, which will be called, respectively, when upgrading the database
   * version or when an already open connection prevents the database from
   * upgrading to the new version.
   *
   * @param {string} name The database to open a connection to.
   * @param {number=} version The desired version of the database. If this is
   *     higher than the database's current version, the `upgrade` callback
   *     will be called once there are no currently open connections to the
   *     database. If there are currently open connections, the `blocked`
   *     callback will be called first.
   * @param {?OpenCallbacks=} An object which provides the `upgrade` and
   *     `blocked` callbacks to use when upgrading the database's version.
   * @return {!Request<IDBDatabase>} A wrapped IDBRequest to open the database.
   */
  open(name, version = 1, { upgrade, blocked } = {}) {
    const request = indexedDB.open(name, version);
    const wrapped = new Request(request);

    /**
     * This is the wrapped Request's resolve function. We're wrapping it so
     * that the request resolves with our wrapped Database instance.
     *
     * @type {!function(*)}
     */
    const resolve = request.onsuccess;
    request.onsuccess = () => {
      resolve({
        target: {
          result: new Database(request.result),
        }
      });
    };

    if (upgrade) {
      request.onupgradeneeded = (event) => {
        const transaction = new VersionChangeTransaction(event.target.transaction);
        upgrade(transaction.db, versionChangeEvent(event, transaction));
      };
    }

    if (blocked) {
      request.onblocked = (event) => {
        blocked(versionChangeEvent(event));
      };
    }

    return wrapped;
  },
};

export default indexedDBP;
export {
  SyncPromise,
};
