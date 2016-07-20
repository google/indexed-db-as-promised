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

describe('Request', () => {
  let db;
  beforeEach(() => {
    return iDb.open('test', 1, {
      upgrade(db) {
        const store = db.createObjectStore('test', {
          autoIncrement: true,
        });
        store.createIndex('name', 'name');
      },
    }).then((d) => {
      db = d;
    });
  });

  describe('#source', () => {
    describe('when indexDB creates the request', () => {
      it('returns null');
    });

    describe('when objectStore creates the request', () => {
      it('returns the objectStore', () => {
        return db.transaction('test').run((tx) => {
          const store = tx.objectStore('test');
          expect(store.count().source).to.equal(store);
        });
      });
    });

    describe('when cursor creates the request', () => {
      it('returns the cursor', () => {
        return db.transaction('test', 'readwrite').run((tx) => {
          const store = tx.objectStore('test');
          return store.add({}).then(() => {
            const cursorRequest = store.openCursor();
            expect(cursorRequest.source).to.equal(store);
            return cursorRequest.iterate((cursor) => {
              expect(cursor.delete().source).to.equal(cursor);
            });
          });
        });
      });
    });

    describe('when index creates the request', () => {
      it('returns the index', () => {
        return db.transaction('test').run((tx) => {
          const index = tx.objectStore('test').index('name');
          expect(index.count().source).to.equal(index);
        });
      });
    });
  });

  describe('#readyState', () => {
    describe('when request is pending', () => {
      it('returns pending', () => {
        return db.transaction('test').run((tx) => {
          const store = tx.objectStore('test');
          expect(store.count().readyState).to.equal('pending');
        });
      });
    });

    describe('when request is complete', () => {
      it('returns done', () => {
        return db.transaction('test').run((tx) => {
          const store = tx.objectStore('test');
          const request = store.count();
          return request.then(() => {
            expect(request.readyState).to.equal('done');
          });
        });
      });
    });
  });

  describe('#transaction', () => {
    describe('when indexDB creates the request', () => {
      it('returns null');

      describe('during upgrade event', () => {
        it('returns a new versionchange transaction');
      });
    });

    describe('when objectStore creates the request', () => {
      it('returns the transaction', () => {
        return db.transaction('test').run((tx) => {
          const store = tx.objectStore('test');
          expect(store.count().transaction).to.equal(tx);
        });
      });
    });

    describe('when cursor creates the request', () => {
      it('returns the cursor', () => {
        return db.transaction('test', 'readwrite').run((tx) => {
          const store = tx.objectStore('test');
          return store.add({}).then(() => {
            const cursorRequest = store.openCursor();
            expect(cursorRequest.source).to.equal(store);
            return cursorRequest.iterate((cursor) => {
              expect(cursor.delete().transaction).to.equal(tx);
            });
          });
        });
      });
    });

    describe('when index creates the request', () => {
      it('returns the index', () => {
        return db.transaction('test').run((tx) => {
          const index = tx.objectStore('test').index('name');
          expect(index.count().transaction).to.equal(tx);
        });
      });
    });
  });

  describe('#run', () => {
    it('waits until request is complete', () => {
      return db.transaction('test').run((tx) => {
        const store = tx.objectStore('test');
        let sync = true;
        const p = store.count().then(() => {
          expect(sync).to.be.false();
        });
        sync = false;
        return p;
      });
    });
  });
});
