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

import { expect } from 'chai';
import iDb from '../src/index';

describe('ObjectStore', () => {
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

  function test(mode, cb) {
    if (!cb) {
      cb = mode;
      mode = 'readwrite';
    }
    return db.transaction(['test'], mode).run((tx) => {
      const store = tx.objectStore('test');
      return cb(store, tx);
    });
  }

  describe('#autoIncrement', () => {
    it('returns the whether the objectStore uses autoIncrement', () => {
      return test((store) => {
        expect(store.autoIncrement).to.equal(true);
      });
    });
  });

  describe('#indexNames', () => {
    it('returns a list of the index names', () => {
      return test((store) => {
        expect(store.indexNames).to.deep.equal(['name']);
      });
    });
  });

  describe('#keyPath', () => {
    it('returns the keyPath of the objectStore', () => {
      return test((store) => {
        expect(store.keyPath).to.equal(null);
      });
    });
  });

  describe('#name', () => {
    it('returns the name of the objectStore', () => {
      return test((store) => {
        expect(store.name).to.equal('test');
      });
    });
  });

  describe('#transaction', () => {
    it('returns the transaction associated with the objectStore', () => {
      return test((store, tx) => {
        expect(store.transaction).to.equal(tx);
      });
    });

    it('has a transaction during upgrade events', () => {
      db.close();
      return iDb.open('test', 2, {
        upgrade(db, { transaction }) {
          const store = db.createObjectStore('test2');
          expect(store.transaction).to.equal(transaction);
        },
      });
    });
  });

  describe('#add', () => {
    it('adds an record to the objectStore', () => {
      return test((store) => {
        return store.add({}).then(() => {
          return store.count();
        });
      }).then((count) => {
        expect(count).to.equal(1);
      });
    });

    it('returns the key used to store the record', () => {
      return test((store) => {
        return store.add({ name: 'test' });
      }).then((key) => {
        expect(key).to.equal(1);
      });
    });

    it('optionally takes a key', () => {
      return test((store) => {
        return store.add({}, 'test');
      }).then((key) => {
        expect(key).to.equal('test');
      });
    });

    it('rejects if add fails', () => {
      return expect(test((store) => {
        return store.add({}, 'test').then(() => {
          return expect(store.add({}, 'test')).
            to.eventually.be.rejectedWith(Error);
        });
      })).to.eventually.be.rejectedWith(Error);
    });

    it('throws if add errors', () => {
      return test('readonly', (store) => {
        expect(() => {
          store.add({}, 'test');
        }).to.throw(Error);
      });
    });
  });

  describe('#clear', () => {
    beforeEach(() => {
      return test((store) => {
        store.add({});
      });
    });

    it('removes all records from the objectStore', () => {
      return test((store) => {
        return store.clear().then(() => {
          return store.count();
        });
      }).then((count) => {
        expect(count).to.equal(0);
      });
    });

    it('throws if clear errors', () => {
      return test('readonly', (store) => {
        expect(() => {
          store.clear();
        }).to.throw(Error);
      });
    });
  });

  describe('#count', () => {
    beforeEach(() => {
      return test((store) => {
        store.add({});
      });
    });

    it('returns the record count', () => {
      return test((store) => {
        return store.count();
      }).then((count) => {
        expect(count).to.equal(1);
      });
    });

    it('optionally takes a query', () => {
      return test((store) => {
        return store.add({}).then(() => {
          return store.count(IDBKeyRange.lowerBound(3));
        });
      }).then((count) => {
        expect(count).to.equal(0);
      });
    });
  });

  describe('#createIndex', () => {
    function upgrade(cb) {
      db.close();
      return iDb.open('test', 2, {
        upgrade: (db) => {
          cb(db.createObjectStore('index'), db);
        },
      });
    }

    it('creates an index on the objectStore', () => {
      return upgrade((store) => {
        store.createIndex('index', 'index');
        expect(store.indexNames).to.deep.equal(['index']);
      });
    });

    it('throws error if index exists', () => {
      return upgrade((store) => {
        store.createIndex('index', 'index');
        expect(() => {
          store.createIndex('index', 'other');
        }).to.throw(Error);
      });
    });

    it('throws error outside of upgrade event', () => {
      return test((store) => {
        expect(() => {
          store.createIndex('index', 'other');
        }).to.throw(Error);
      });
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      return test((store) => {
        store.add({});
      });
    });

    it('deletes the record', () => {
      return test((store) => {
        return store.delete(1).then(() => {
          return store.count();
        });
      }).then((count) => {
        expect(count).to.equal(0);
      });
    });

    it('throws if delete errors', () => {
      return test('readonly', (store) => {
        expect(() => {
          store.delete(1);
        }).to.throw(Error);
      });
    });
  });

  describe('#deleteIndex', () => {
    function upgrade(cb) {
      db.close();
      return iDb.open('test', 2, {
        upgrade: (db) => {
          const store = db.createObjectStore('index');
          store.createIndex('index', 'index');
          cb(store, db);
        },
      });
    }

    it('deletes the index', () => {
      return upgrade((store) => {
        store.deleteIndex('index');
        expect(store.indexNames).to.deep.equal([]);
      });
    });

    it('throws error if index does not exist', () => {
      return upgrade((store) => {
        expect(() => {
          store.deleteIndex('non-existent');
        }).to.throw(Error);
      });
    });

    it('throws error outside of upgrade event', () => {
      return test((store) => {
        expect(() => {
          store.deleteIndex('index');
        }).to.throw(Error);
      });
    });
  });

  describe('#get', () => {
    beforeEach(() => {
      return test((store) => {
        store.add('test');
      });
    });

    it('gets the record', () => {
      return test((store) => {
        return store.get(1);
      }).then((record) => {
        expect(record).to.equal('test');
      });
    });

    it('throws if get errors', () => {
      return test((store) => {
        expect(() => {
          store.get(null);
        }).to.throw(Error);
      });
    });
  });

  xdescribe('#getAll', () => {
    beforeEach(() => {
      return test((store) => {
        store.add('test1');
        store.add('test2');
      });
    });

    it('gets all the record', () => {
      return test((store) => {
        return store.getAll();
      }).then((all) => {
        expect(all).to.deep.equal([
          'test1',
          'test2',
        ]);
      });
    });

    it('optionally takes a query', () => {
      return test((store) => {
        return store.getAll(IDBKeyRange.upperBound(1));
      }).then((all) => {
        expect(all).to.deep.equal(['test1']);
      });
    });

    it('optionally takes a count', () => {
      return test((store) => {
        return store.add('test3').then(() => {
          return store.getAll(undefined, 2);
        });
      }).then((all) => {
        expect(all).to.deep.equal([
          'test1',
          'test2',
        ]);
      });
    });

    it('optionally takes a query and a count', () => {
      return test((store) => {
        return store.add('test3').then(() => {
          return store.getAll(IDBKeyRange.upperBound(2), 1);
        });
      }).then((all) => {
        expect(all).to.deep.equal(['test1']);
      });
    });
  });

  xdescribe('#getAllKeys', () => {
    beforeEach(() => {
      return test((store) => {
        store.add('test1');
        store.add('test2');
      });
    });

    it('gets all the record keys', () => {
      return test((store) => {
        return store.getAllKeys();
      }).then((all) => {
        expect(all).to.deep.equal([1, 2]);
      });
    });

    it('optionally takes a query', () => {
      return test((store) => {
        return store.getAllKeys(IDBKeyRange.upperBound(1));
      }).then((all) => {
        expect(all).to.deep.equal([1]);
      });
    });

    it('optionally takes a count', () => {
      return test((store) => {
        return store.add('test3').then(() => {
          return store.getAllKeys(undefined, 2);
        });
      }).then((all) => {
        expect(all).to.deep.equal([1, 2]);
      });
    });

    it('optionally takes a query and a count', () => {
      return test((store) => {
        return store.add('test3').then(() => {
          return store.getAllKeys(IDBKeyRange.upperBound(2), 1);
        });
      }).then((all) => {
        expect(all).to.deep.equal([1]);
      });
    });
  });

  describe('#index', () => {
    it('returns the index', () => {
      return test((store) => {
        expect(store.index('name').name).to.equal('name');
      });
    });

    it('throws if index does not exist', () => {
      return test((store) => {
        expect(() => {
          store.index('non-existent');
        }).to.throw(Error);
      });
    });
  });

  describe('#openCursor', () => {
    beforeEach(() => {
      return test((store) => {
        store.add('test1');
        store.add('test2');
        store.add('test3');
      });
    });

    it('returns a cursor', () => {
      return test((store) => {
        let index = 0;
        return store.openCursor().iterate((cursor) => {
          index++;
          expect(cursor.key).to.equal(index);
          expect(cursor.value).to.equal(`test${index}`);
          cursor.continue();
        }).then(() => {
          return index;
        });
      }).then((index) => {
        expect(index).to.equal(3);
      });
    });

    it('optionally takes a query', () => {
      return test((store) => {
        let index = 0;
        const query = IDBKeyRange.upperBound(2);
        return store.openCursor(query).iterate((cursor) => {
          index++;
          expect(cursor.value).to.equal(`test${index}`);
          cursor.continue();
        }).then(() => index);
      }).then((index) => {
        expect(index).to.equal(2);
      });
    });

    it('optionally takes a direction', () => {
      return test((store) => {
        let index = 4;
        return store.openCursor(null, 'prev').iterate((cursor) => {
          index--;
          expect(cursor.value).to.equal(`test${index}`);
          cursor.continue();
        }).then(() => index);
      }).then((index) => {
        expect(index).to.equal(1);
      });
    });

    it('optionally takes a query and a direction', () => {
      return test((store) => {
        let index = 3;
        const query = IDBKeyRange.upperBound(2);
        return store.openCursor(query, 'prev').iterate((cursor) => {
          index--;
          expect(cursor.value).to.equal(`test${index}`);
          cursor.continue();
        }).then(() => index);
      }).then((index) => {
        expect(index).to.equal(1);
      });
    });
  });

  xdescribe('#openKeyCursor', () => {
    beforeEach(() => {
      return test((store) => {
        store.add('test1');
        store.add('test2');
        store.add('test3');
      });
    });

    it('returns a cursor', () => {
      return test((store) => {
        let index = 0;
        return store.openKeyCursor().iterate((cursor) => {
          index++;
          expect(cursor.key).to.equal(index);
          expect(cursor.value).to.equal(undefined);
          cursor.continue();
        }).then(() => {
          return index;
        });
      }).then((index) => {
        expect(index).to.equal(3);
      });
    });

    it('optionally takes a query', () => {
      return test((store) => {
        let index = 0;
        const query = IDBKeyRange.upperBound(2);
        return store.openKeyCursor(query).iterate((cursor) => {
          index++;
          expect(cursor.key).to.equal(index);
          cursor.continue();
        }).then(() => index);
      }).then((index) => {
        expect(index).to.equal(2);
      });
    });

    it('optionally takes a direction', () => {
      return test((store) => {
        let index = 4;
        return store.openKeyCursor(null, 'prev').iterate((cursor) => {
          index--;
          expect(cursor.key).to.equal(index);
          cursor.continue();
        }).then(() => index);
      }).then((index) => {
        expect(index).to.equal(1);
      });
    });

    it('optionally takes a query and a direction', () => {
      return test((store) => {
        let index = 3;
        const query = IDBKeyRange.upperBound(2);
        return store.openKeyCursor(query, 'prev').iterate((cursor) => {
          index--;
          expect(cursor.key).to.equal(index);
          cursor.continue();
        }).then(() => index);
      }).then((index) => {
        expect(index).to.equal(1);
      });
    });
  });
});
