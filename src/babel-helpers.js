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

export function classCallCheck() {}

export function createClass(Constructor, protoProps) {
  const prototype = Constructor.prototype;
  for (let i = 0; i < protoProps.length; i++) {
    const descriptor = protoProps[i];
    descriptor.configurable = true;
    Object.defineProperty(prototype, descriptor.key, descriptor);
  }
}

export function inherits(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype, {
    constructor: {
      configurable: true,
      writable: true,
      value: subClass,
    },
  });
}

export function possibleConstructorReturn(self, call) {
  return call || self;
}

export function interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj,
  };
}
