import { expect } from 'chai';
import iDb from '../src/index';

describe('Index', () => {
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

  function test(cb) {
    return db.transaction(['test'], 'readwrite').run((tx) => {
      const store = tx.objectStore('test');
      const index = store.index('name');
      return cb(index, store, tx);
    });
  }

  describe('#keyPath', () => {
    it('returns the keyPath of the objectStore', () => {
      return test((index) => {
        expect(index.keyPath).to.equal('name');
      });
    });
  });

  describe('#multiEntry', () => {
    it('returns whether the index is multiEntry', () => {
      return test((index) => {
        expect(index.multiEntry).to.equal(false);
      });
    });
  });

  describe('#name', () => {
    it('returns the name of the objectStore', () => {
      return test((index) => {
        expect(index.name).to.equal('name');
      });
    });
  });

  describe('#unique', () => {
    it('returns whether the index is unique', () => {
      return test((index) => {
        expect(index.unique).to.equal(false);
      });
    });
  });

  describe('#count', () => {
    beforeEach(() => {
      return test((index, store) => {
        store.add({ name: 1 });
        store.add({});
      });
    });

    it('returns the record count', () => {
      return test((index) => {
        return index.count();
      }).then((count) => {
        expect(count).to.equal(1);
      });
    });

    it('optionally takes a query', () => {
      return test((index, store) => {
        return store.add({ name: 4 }).then(() => {
          return index.count(IDBKeyRange.lowerBound(3));
        });
      }).then((count) => {
        expect(count).to.equal(1);
      });
    });
  });


  describe('#get', () => {
    beforeEach(() => {
      return test((index, store) => {
        store.add({ name: 1 });
      });
    });

    it('gets the record', () => {
      return test((index) => {
        return index.get(1);
      }).then((record) => {
        expect(record).to.deep.equal({ name: 1 });
      });
    });
  });

  xdescribe('#getAll', () => {
    beforeEach(() => {
      return test((index, store) => {
        store.add({ name: 1 });
        store.add({ name: 2 });
      });
    });

    it('gets all the record', () => {
      return test((index) => {
        return index.getAll();
      }).then((all) => {
        expect(all).to.deep.equal([
          { name: 1 },
          { name: 2 },
        ]);
      });
    });

    it('optionally takes a query', () => {
      return test((index) => {
        return index.getAll(IDBKeyRange.upperBound(1));
      }).then((all) => {
        expect(all).to.deep.equal([{ name: 1 }]);
      });
    });

    it('optionally takes a count', () => {
      return test((index, store) => {
        return store.add({ name: 3 }).then(() => {
          return index.getAll(undefined, 2);
        });
      }).then((all) => {
        expect(all).to.deep.equal([
          { name: 1 },
          { name: 2 },
        ]);
      });
    });

    it('optionally takes a query and a count', () => {
      return test((index, store) => {
        return store.add({ name: 3 }).then(() => {
          return index.getAll(IDBKeyRange.upperBound(2), 1);
        });
      }).then((all) => {
        expect(all).to.deep.equal([{ name: 1 }]);
      });
    });
  });

  xdescribe('#getAllKeys', () => {
    beforeEach(() => {
      return test((index, store) => {
        store.add({ name: 1 });
        store.add({ name: 2 });
      });
    });

    it('gets all the record keys', () => {
      return test((index) => {
        return index.getAllKeys();
      }).then((all) => {
        expect(all).to.deep.equal([1, 2]);
      });
    });

    it('optionally takes a query', () => {
      return test((index) => {
        return index.getAllKeys(IDBKeyRange.upperBound(1));
      }).then((all) => {
        expect(all).to.deep.equal([1]);
      });
    });

    it('optionally takes a count', () => {
      return test((index, store) => {
        return store.add({ name: 3 }).then(() => {
          return index.getAllKeys(undefined, 2);
        });
      }).then((all) => {
        expect(all).to.deep.equal([1, 2]);
      });
    });

    it('optionally takes a query and a count', () => {
      return test((index, store) => {
        return store.add({ name: 3 }).then(() => {
          return index.getAllKeys(IDBKeyRange.upperBound(2), 1);
        });
      }).then((all) => {
        expect(all).to.deep.equal([1]);
      });
    });
  });

  describe('#openCursor', () => {
    beforeEach(() => {
      return test((index, store) => {
        store.add({ name: 1 });
        store.add({ name: 2 });
        store.add({ name: 3 });
      });
    });

    it('returns a cursor', () => {
      return test((index) => {
        let i = 0;
        return index.openCursor().iterate((cursor) => {
          i++;
          expect(cursor.key).to.equal(i);
          expect(cursor.value).to.deep.equal({ name: i });
          cursor.continue();
        }).then(() => {
          return i;
        });
      }).then((i) => {
        expect(i).to.equal(3);
      });
    });

    it('optionally takes a query', () => {
      return test((index) => {
        let i = 0;
        const query = IDBKeyRange.upperBound(2);
        return index.openCursor(query).iterate((cursor) => {
          i++;
          expect(cursor.value).to.deep.equal({ name: i });
          cursor.continue();
        }).then(() => i);
      }).then((i) => {
        expect(i).to.equal(2);
      });
    });

    it('optionally takes a direction', () => {
      return test((index) => {
        let i = 4;
        return index.openCursor(null, 'prev').iterate((cursor) => {
          i--;
          expect(cursor.value).to.deep.equal({ name: i });
          cursor.continue();
        }).then(() => i);
      }).then((i) => {
        expect(i).to.equal(1);
      });
    });

    it('optionally takes a query and a direction', () => {
      return test((index) => {
        let i = 3;
        const query = IDBKeyRange.upperBound(2);
        return index.openCursor(query, 'prev').iterate((cursor) => {
          i--;
          expect(cursor.value).to.deep.equal({ name: i });
          cursor.continue();
        }).then(() => i);
      }).then((i) => {
        expect(i).to.equal(1);
      });
    });
  });

  xdescribe('#openKeyCursor', () => {
    beforeEach(() => {
      return test((index, store) => {
        store.add({ name: 1 });
        store.add({ name: 2 });
        store.add({ name: 3 });
      });
    });

    it('returns a cursor', () => {
      return test((index) => {
        let i = 0;
        return index.openKeyCursor().iterate((cursor) => {
          i++;
          expect(cursor.key).to.equal(i);
          expect(cursor.value).to.equal(undefined);
          cursor.continue();
        }).then(() => {
          return i;
        });
      }).then((i) => {
        expect(i).to.equal(3);
      });
    });

    it('optionally takes a query', () => {
      return test((index) => {
        let i = 0;
        const query = IDBKeyRange.upperBound(2);
        return index.openKeyCursor(query).iterate((cursor) => {
          i++;
          expect(cursor.key).to.equal(i);
          cursor.continue();
        }).then(() => i);
      }).then((i) => {
        expect(i).to.equal(2);
      });
    });

    it('optionally takes a direction', () => {
      return test((index) => {
        let i = 4;
        return index.openKeyCursor(null, 'prev').iterate((cursor) => {
          i--;
          expect(cursor.key).to.equal(i);
          cursor.continue();
        }).then(() => i);
      }).then((i) => {
        expect(i).to.equal(1);
      });
    });

    it('optionally takes a query and a direction', () => {
      return test((index) => {
        let i = 3;
        const query = IDBKeyRange.upperBound(2);
        return index.openKeyCursor(query, 'prev').iterate((cursor) => {
          i--;
          expect(cursor.key).to.equal(i);
          cursor.continue();
        }).then(() => i);
      }).then((i) => {
        expect(i).to.equal(1);
      });
    });
  });
});
