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
