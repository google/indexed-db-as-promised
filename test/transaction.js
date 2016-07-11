import { expect } from 'chai';
import iDb from '../src/indexed-db';

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
      it('returns versionchange');
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
      describe('when the scope has only one item', () => {
        it('returns the objectStore name in scope', () => {
          return db.transaction(['test']).run((tx) => {
            expect(tx.objectStoreNames).to.deep.equal(['test']);
          });
        });
      });

      describe('when the scope has multiple items', () => {
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
      return db.transaction('test', 'readwrite').run((tx) => {
        const store = tx.objectStore('test');
        store.add({}).then(() => {
          tx.abort();
          called = true;
        });
      }).catch(() => {
        return db.transaction('test').run((tx) => {
          const store = tx.objectStore('test');
          return store.count();
        });
      }).then((count) => {
        expect(called).to.be.true();
        expect(count).to.equal(0);
      });
    });

    it('may optionally be recovered', () => {
      let called = false;
      return db.transaction('test', 'readwrite', {
        aborted() { },
      }).run((tx) => {
        const store = tx.objectStore('test');
        store.add({}).then(() => {
          tx.abort();
          called = true;
        });
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
  });

  describe('#objectStore', () => {
    it('returns the objectStore', () => {
      return db.transaction('test', 'readwrite').run((tx) => {
        const store = tx.objectStore('test');
        expect(store.name).to.equal('test');
      });
    });
  });

  describe('#then', () => {
    it('returns the result of then', () => {
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
          return tx.objectStore('test').get('test').then((item) => {
            expect(item).to.equal('test');
          });
        });
      });
    });

    describe('when handling an abort', () => {
      it('returns the result of aborted', () => {
        return db.transaction('test', 'readwrite', {
          aborted() {
            return 1;
          },
        }).run((tx) => {
          tx.abort();
        }).then((result) => {
          expect(result).to.equal(1);
        });
      });

      it('resolves after abort completes', () => {
        let complete = false;
        return db.transaction('test', 'readwrite', {
          aborted() {
            return db.transaction('test').run((tx) => {
              tx.objectStore('test').count().then(() => {
                complete = true;
              });
            });
          },
        }).run((tx) => {
          tx.abort();
        }).then(() => {
          expect(complete).to.be.true();
        });
      });
    });
  });

  describe('#catch', () => {
    it('waits until transaction is complete', () => {
      let complete = false;
      return db.transaction('test', 'readwrite').run((tx) => {
        let sync = true;
        tx.objectStore('test').add('test', 'test').then(() => {
          tx.abort();
          expect(sync).to.be.false();
          complete = true;
        });
        sync = false;
      }).catch(() => {
        expect(complete).to.be.true();
      });
    });
  });
});
