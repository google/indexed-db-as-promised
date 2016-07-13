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
