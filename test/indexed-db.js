import { expect } from 'chai';
import iDb from '../src/index';

describe('IndexedDB', () => {
  describe('#open', () => {
    it('creates a new database', () => {
      return iDb.open('test').then((db) => {
        expect(db).to.exist();
      });
    });

    it('creates a new database with version', () => {
      return iDb.open('test', 5).then((db) => {
        expect(db.version).to.equal(5);
      });
    });

    it('throws error synchronously', () => {
      expect(() => {
        iDb.open('test', -1);
      }).to.throw(Error);
    });

    describe('upgrade', () => {
      it('calls during upgrade', () => {
        let resolve;
        const upgrade = new Promise((r) => {
          resolve = r;
        });

        iDb.open('test', 1, {
          upgrade: resolve,
        });
        return upgrade;
      });

      it('passes eventual Database instance', () => {
        let resolve;
        const upgrade = new Promise((r) => {
          resolve = r;
        });

        return Promise.all([
          iDb.open('test', 1, {
            upgrade(db) {
              resolve(db);
            },
          }),
          upgrade,
        ]).then(([db, upgradeDb]) => {
          expect(db).to.equal(upgradeDb);
        });
      });

      it('passes event data', () => {
        let resolve;
        const upgrade = new Promise((r) => {
          resolve = r;
        });

        iDb.open('test', 1, {
          upgrade(db, event) {
            resolve(event);
          },
        });

        return upgrade.then((event) => {
          expect(event.oldVersion).to.equal(0);
          expect(event.newVersion).to.equal(1);
        });
      });

      it('passes upgrade transaction instance', () => {
        let resolve;
        const upgrade = new Promise((r) => {
          resolve = r;
        });

        iDb.open('test', 1, {
          upgrade(db, event) {
            resolve(event);
          },
        });

        return upgrade.then((event) => {
          expect(event.transaction.mode).to.equal('versionchange');
        });
      });
    });

    describe('blocked', () => {
      it('calls when open db blocks version upgrade', () => {
        return iDb.open('test', 1).then((db) => {
          let resolve;
          const blocked = new Promise((r) => {
            resolve = r;
          });

          iDb.open('test', 2, {
            blocked: resolve,
          });
          return blocked.then(() => {
            // Cleanup
            db.close();
          });
        });
      });

      it('passes event data', () => {
        return iDb.open('test', 1).then((db) => {
          let resolve;
          const blocked = new Promise((r) => {
            resolve = r;
          });

          iDb.open('test', 2, {
            blocked: resolve,
          });
          return blocked.then((event) => {
            expect(event.oldVersion).to.equal(1);
            expect(event.newVersion).to.equal(2);

            // Cleanup
            db.close();
          });
        });
      });

      it('passes no transaction', () => {
        return iDb.open('test', 1).then((db) => {
          let resolve;
          const blocked = new Promise((r) => {
            resolve = r;
          });

          iDb.open('test', 2, {
            blocked: resolve,
          });
          return blocked.then((event) => {
            expect(event.transaction).to.be.null();

            // Cleanup
            db.close();
          });
        });
      });
    });
  });

  describe('#deleteDatabase', () => {
    beforeEach(() => {
      return iDb.open('test', 2).then((db) => {
        db.close();
      });
    });

    it('deletes the database', () => {
      return iDb.deleteDatabase('test').then(() => {
        return iDb.open('test');
      }).then((db) => {
        expect(db.version).to.equal(1);
      });
    });
  });
});
