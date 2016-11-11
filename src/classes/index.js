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

/**
 * A wrapper around IDBIndex, which provides a thin Promise-like API.
 */
export default class Index extends DataSource {
  /**
   * @param {!IDBIndex} index
   * @param {!Transaction} transaction The transaction that opened this index
   * @param {!ObjectStore} objectStore the ObjectStore this index belongs to.
   */
  constructor(index, transaction, objectStore) {
    super(index, transaction);

    /** @const */
    this.objectStore = objectStore;

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
}
