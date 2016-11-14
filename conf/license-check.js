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
'use strict';

const through2 = require('through2');
const fs = require('fs');

const license = fs.readFileSync(`${__dirname}/license_header.txt`, 'utf8');

module.exports = function() {
  return through2.obj((file, enc, cb) => {
    const contents = file.contents.toString();
    for (let i = 0; i < license.length; i++) {
      if (contents[i] !== license[i]) {
        cb(new Error('license file not present in ' + file.path));
      }
    }
    cb(null)
  });
}
