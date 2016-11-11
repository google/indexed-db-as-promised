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

/**
 * A partial application that will wait until called before resolving.
 *
 * @param {function(T)} resolve
 * @template T
 */
export function resolveWithResult(resolve) {
  /**
   * A callback that takes the `target.result` value and forwards it.
   *
   * @param {Event} event
   */
  const resolver = (event) => {
    resolve(event.target.result);
  };
  return resolver;
}

/**
 * A partial application that will wait until called before rejecting.
 *
 * @param {function(T)} reject
 * @template T
 */
export function rejectWithError(reject) {
  /**
   * A callback that takes the `target.error` value and forwards it.
   *
   * @param {Event} event
   */
  const rejecter = (event) => {
    reject(event.target.error);
  };
  return rejecter;
}
