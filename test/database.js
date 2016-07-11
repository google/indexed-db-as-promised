import { expect } from 'chai';
import iDb from '../src/indexed-db';

describe('Database', () => {
  let db;
  beforeEach(() => {
    return iDb.open('test', 1, {
      upgrade(db) {
        db.createObjectStore('test');
      },
    }).then((d) => {
      db = d;
    });
  });

  describe('#name', () => {
    it('returns the database name', () => {
      expect(db.name).to.equal('test');
    });
  });

  describe('#objectStoreNames', () => {
    it('returns a list of the database objectStore names', () => {
      expect(db.objectStoreNames).to.deep.equal(['test']);
    });
  });

  describe('#version', () => {
    it('returns the database version', () => {
      expect(db.version).to.deep.equal(1);
    });
  });

  describe('#close', () => {
    it('closes the database connection', () => {
      db.close();
      expect(() => {
        db.transaction('test');
      }).to.throw(Error);
    });
  });

  describe('#createObjectStore', () => {
    beforeEach(() => {
      db.close();
    });

    it('throws error outside upgrade event', () => {
      return iDb.open('test', 1).then((db) => {
        expect(() => {
          db.createObjectStore('test');
        }).to.throw(Error);
      });
    });

    it('creates an objectStore', () => {
      return iDb.open('test', 2, {
        upgrade(db) {
          const store = db.createObjectStore('test2');
          expect(store.name).to.equal('test2');
        },
      }).then((db) => {
        expect(db.objectStoreNames).to.deep.equal(['test', 'test2']);
      });
    });
  });

  describe('#deleteObjectStore', () => {
    beforeEach(() => {
      db.close();
    });

    it('throws error outside upgrade event', () => {
      return iDb.open('test', 1).then((db) => {
        expect(() => {
          db.deleteObjectStore('test');
        }).to.throw(Error);
      });
    });

    it('creates an objectStore', () => {
      return iDb.open('test', 2, {
        upgrade(db) {
          db.deleteObjectStore('test');
        },
      }).then((db) => {
        expect(db.objectStoreNames).to.deep.equal([]);
      });
    });
  });

  describe('#transaction', () => {
    it('opens up a new transaction', () => {
      return db.transaction('test').run((tx) => {
        return tx.objectStore('test').count();
      });
    });

    it('throws error synchronously', () => {
      expect(() => {
        db.transaction('non-existent');
      }).to.throw(Error);
      expect(() => {
        db.transaction('test', 'bad-perms');
      }).to.throw(Error);
    });
  });
});
