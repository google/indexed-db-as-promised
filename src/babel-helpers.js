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
 * Ensures that classes are called with the new operator.
 * As we do not expose any classes, this is a useless check.
 */
export function classCallCheck() {}

/**
 * Sets up the instance methods on the Constructor.
 * @param {!Function} Constructor
 * @param {Array<!Object>} protoProps
 */
export function createClass(Constructor, protoProps) {
  const prototype = Constructor.prototype;
  for (let i = 0; i < protoProps.length; i++) {
    const descriptor = protoProps[i];
    descriptor.configurable = true;
    Object.defineProperty(prototype, descriptor.key, descriptor);
  }
}

/**
 * Sets up the class inheritance.
 * @param {!Function} subClass
 * @param {!Function} superClass
 */
export function inherits(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype, {
    constructor: {
      configurable: true,
      writable: true,
      value: subClass,
    },
  });
}

/**
 * Returns either the super call or this instance in the constructor of a
 * subclass. As we don't explicitly return anything from one of our
 * constructors, always return this instance.
 * @param {!T} self
 * @return {!T}
 * @template T
 */
export function possibleConstructorReturn(self) {
  return self;
}

/**
 * Imports an ES6 module, or a CJS module
 * @param {!Object} obj
 * @return {!Object}
 */
export function interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj,
  };
}
