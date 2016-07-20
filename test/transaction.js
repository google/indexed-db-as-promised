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

import { expect } from 'chai';
import iDb from '../src/index';

describe('Transaction', () => {
  let db;
  beforeEach(() => {
    return iDb.open('test', 1, {
      upgrade(db) {
        db.createObjectStore('test', { autoIncrement: true });
        db.createObjectStore('test2', { autoIncrement: true });
      },
    }).then((d) => {
      db = d;
    });
  });

  describe('#db', () => {
    describe('during upgrade event', () => {
      it('returns a db');
    });

    it('returns the datbase', () => {
      return db.transaction('test').run((tx) => {
        expect(tx.db).to.equal(db);
      });
    });
  });

  describe('#mode', () => {
    describe('during upgrade event', () => {
      it('returns versionchange', () => {
        db.close();
        return iDb.open('test', 2, {
          upgrade(db, { transaction }) {
            expect(transaction.mode).to.equal('versionchange');
          }
        });
      });
    });

    it('defaults to readonly', () => {
      return db.transaction('test').run((tx) => {
        expect(tx.mode).to.equal('readonly');
      });
    });

    it('returns readwrite when transaction can write', () => {
      return db.transaction('test', 'readwrite').run((tx) => {
        expect(tx.mode).to.equal('readwrite');
      });
    });
  });

  xdescribe('#objectStoreNames', () => {
    describe('when scope is a string', () => {
      it('returns the objectStore name in scope', () => {
        return db.transaction('test').run((tx) => {
          expect(tx.objectStoreNames).to.deep.equal(['test']);
        });
      });
    });

    describe('when scope is an array', () => {
      describe('when the scope has only one record', () => {
        it('returns the objectStore name in scope', () => {
          return db.transaction(['test']).run((tx) => {
            expect(tx.objectStoreNames).to.deep.equal(['test']);
          });
        });
      });

      describe('when the scope has multiple records', () => {
        it('returns the objectStore name in scope', () => {
          return db.transaction(['test', 'test2']).run((tx) => {
            expect(tx.objectStoreNames).to.deep.equal(['test', 'test2']);
          });
        });
      });
    });
  });

  describe('#abort', () => {
    it('rolls back any changes', () => {
      let called = false;
      db.transaction('test', 'readwrite').run((tx) => {
        const store = tx.objectStore('test');
        store.add({}).then(() => {
          tx.abort();
          called = true;
        });
      });

      return new Promise((resolve) => {
        setTimeout(resolve, 50);
      }).then(() => {
        return db.transaction('test').run((tx) => {
          const store = tx.objectStore('test');
          return store.count();
        });
      }).then((count) => {
        expect(called).to.be.true();
        expect(count).to.equal(0);
      });
    });

    it('does not resolve the transaction promise', () => {
      let fulfilled = false;
      let rejected = false;
      db.transaction('test', 'readwrite').run((tx) => {
        const store = tx.objectStore('test');
        store.add({}).then(() => {
          tx.abort();
        });
      }).then(() => {
        fulfilled = true;
      }, () => {
        rejected = true;
      });

      return new Promise((resolve) => {
        setTimeout(resolve, 50);
      }).then(() => {
        expect(fulfilled).to.be.false();
        expect(rejected).to.be.false();
      });
    });
  });

  describe('#objectStore', () => {
    it('returns the objectStore', () => {
      return db.transaction('test', 'readwrite').run((tx) => {
        const store = tx.objectStore('test');
        expect(store.name).to.equal('test');
      });
    });

    describe('during upgrade event', () => {
      it('returns the objectStore', () => {
        db.close();
        return iDb.open('test', 2, {
          upgrade(db, { transaction }) {
            const store = transaction.objectStore('test');
            expect(store.name).to.equal('test');
          }
        });
      });
    });

    it('throws if outside the #run block', () => {
      const tx = db.transaction('test', 'readwrite');
      expect(() => {
        tx.objectStore('test');
      }).to.throw(Error);
    });
  });

  describe('#run', () => {
    it('returns the result resolved result', () => {
      return db.transaction('test').run(() => {
        return 1;
      }).then((result) => {
        expect(result).to.equal(1);
      });
    });

    it('resolves after transaction completes', () => {
      let complete = false;
      return db.transaction('test', 'readwrite').run((tx) => {
        let sync = true;
        tx.objectStore('test').add('test', 'test').then(() => {
          expect(sync).to.be.false();
          complete = true;
        });
        sync = false;
        return 1;
      }).then((result) => {
        expect(result).to.equal(1);
        expect(complete).to.be.true();
        return db.transaction('test').run((tx) => {
          return tx.objectStore('test').get('test').then((record) => {
            expect(record).to.equal('test');
          });
        });
      });
    });

    it('throws if run multiple times', () => {
      const transaction = db.transaction('test', 'readwrite');
      return transaction.run(() => {}).then(() => {
        expect(() => {
          transaction.run(() => {});
        }).to.throw(Error);
      });
    });

    it('throw if run during versionchange', () => {
      db.close();
      return iDb.open('test', 2, {
        upgrade(db, { transaction }) {
          expect(() => {
            transaction.run();
          }).to.throw(Error);
        }
      });
    });
  });
});
