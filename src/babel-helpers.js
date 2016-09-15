export function classCallCheck() {}

export function createClass(Constructor, protoProps) {
  const prototype = Constructor.prototype;
  for (var i = 0; i < protoProps.length; i++) {
    var descriptor = protoProps[i];
    descriptor.enumerable = false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(prototype, descriptor.key, descriptor);
  }
}

export function inherits(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype, {
    constructor: {
      configurable: true,
      writable: true,
      value: subClass,
    }
  });
}

export function possibleConstructorReturn(self, call) {
  return call || self;
}

export function interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj
  };
};
