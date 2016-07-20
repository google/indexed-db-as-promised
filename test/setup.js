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

import chai, { Assertion, util } from 'chai';
import chaiPromised from 'chai-as-promised';
import iDb from '../src/index';
import indexedDB from './mock/indexed-db';

chai.use(chaiPromised);

[
  'ok',
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'exist',
  'empty',
  'arguments',
  'extensible',
  'sealed',
  'frozen',
].filter((assertion) => {
  return !!Object.getOwnPropertyDescriptor(Assertion.prototype, assertion).get;
}).forEach((assertion) => {
  const fn = Object.getOwnPropertyDescriptor(Assertion.prototype, assertion).get;
  delete Assertion.prototype[assertion];
  Assertion.addMethod(assertion, function assertion(message = '') {
    if (message) util.flag('message', message);
    return fn.call(this);
  });
});

afterEach(() => {
  const databases = indexedDB._databases;
  const promises = Object.keys(databases).map((name) => {
    const database = databases[name];
    database.connections.forEach((conn) => conn.close());
    return iDb.deleteDatabase(name);
  });
  return Promise.all(promises);
});
