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
