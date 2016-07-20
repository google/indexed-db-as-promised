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

describe('Cursor', () => {
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
      test((store) => {
        for (let i = 1; i < 10; i++) {
          store.add({ i, name: `name${i}` });
        }
      });
    });
  });

  // Our Mock library fails us.
  function fixPrimaryKey(request) {
    const onsuccess = request.cursorRequest_.onsuccess;
    request.cursorRequest_.onsuccess = function success(event) {
      const result = event.target.result;
      if (result) {
        event.target.result = Object.create(result, {
          primaryKey: {
            get() {
              return result.value.i;
            },
          },
          value: {
            get() {
              return result.value;
            },
            set(v) {
              result.value = v;
            },
          },
        });
      }
      return onsuccess.call(this, event);
    };
  }

  function test(cb) {
    return db.transaction(['test'], 'readwrite').run((tx) => {
      const store = tx.objectStore('test');
      return cb(store);
    });
  }

  function propertyTest(direction, index, cb) {
    if (index === undefined) {
      cb = direction;
      index = false;
      direction = undefined;
    } else if (typeof direction === 'boolean') {
      cb = index;
      index = direction;
      direction = undefined;
    } else {
      cb = index;
      index = false;
    }
    return db.transaction(['test'], 'readwrite').run((tx) => {
      const store = tx.objectStore('test');
      const source = index ? store.index('name') : store;
      const request = source.openCursor(null, direction);
      fixPrimaryKey(request);
      return request.iterate(cb);
    });
  }

  describe('#direction', () => {
    it('defaults to "next"', () => {
      let called = false;
      return propertyTest((cursor) => {
        expect(cursor.direction).to.equal('next');
        called = true;
      }).then(() => {
        expect(called).to.be.true();
      });
    });

    describe('when given a direction', () => {
      it('returns that direction', () => {
        let called = false;
        return propertyTest('prev', (cursor) => {
          expect(cursor.direction).to.equal('prev');
          called = true;
        }).then(() => {
          expect(called).to.be.true();
        });
      });
    });
  });

  describe('#key', () => {
    describe('when iterating an objectStore', () => {
      it('returns the objectStore key', () => {
        let calls = 0;
        return propertyTest((cursor) => {
          calls++;
          expect(cursor.key).to.equal(calls);
          expect(cursor.key).to.equal(cursor.primaryKey);
          if (calls === 1) {
            cursor.continue();
          }
        }).then(() => {
          expect(calls).to.equal(2);
        });
      });
    });

    describe('when iterating an index', () => {
      it('returns the indexing key', () => {
        let calls = 0;
        return propertyTest(true, (cursor) => {
          calls++;
          expect(cursor.key).to.equal(`name${calls}`);
          if (calls === 1) {
            cursor.continue();
          }
        }).then(() => {
          expect(calls).to.equal(2);
        });
      });
    });
  });

  describe('#primaryKey', () => {
    describe('when iterating an objectStore', () => {
      it('returns the objectStore primaryKey', () => {
        let calls = 0;
        return propertyTest((cursor) => {
          calls++;
          expect(cursor.primaryKey).to.equal(calls);
          if (calls === 1) {
            cursor.continue();
          }
        }).then(() => {
          expect(calls).to.equal(2);
        });
      });
    });

    describe('when iterating an index', () => {
      it('returns the objectStore primaryKey', () => {
        let calls = 0;
        return propertyTest(true, (cursor) => {
          calls++;
          expect(cursor.primaryKey).to.equal(calls);
          if (calls === 1) {
            cursor.continue();
          }
        }).then(() => {
          expect(calls).to.equal(2);
        });
      });
    });
  });

  describe('#value', () => {
    it('returns the current record', () => {
      let calls = 0;
      return propertyTest((cursor) => {
        calls++;
        expect(cursor.value).to.deep.equal({ i: calls, name: `name${calls}` });
        if (calls === 1) {
          cursor.continue();
        }
      }).then(() => {
        expect(calls).to.equal(2);
      });
    });
  });

  describe('#update', () => {
    it('updates the current record', () => {
      return propertyTest((cursor) => {
        cursor.update({ i: cursor.value.i, name: 'test' });
      }).then(() => {
        return db.transaction(['test'], 'readonly').run((tx) => {
          const store = tx.objectStore('test');
          return store.get(1);
        });
      }).then((result) => {
        expect(result.name).to.equal('test');
      });
    });

    it('does not advance the cursor', () => {
      let calls = 0;
      return propertyTest((cursor) => {
        calls++;
        cursor.update({ i: calls, name: 'test' });
      }).then(() => {
        expect(calls).to.equal(1);
      });
    });
  });

  describe('#delete', () => {
    it('deletes the current record', () => {
      return propertyTest((cursor) => {
        cursor.delete();
      }).then(() => {
        return db.transaction(['test'], 'readonly').run((tx) => {
          const store = tx.objectStore('test');
          return store.get(1);
        });
      }).then((result) => {
        expect(result).to.not.exist();
      });
    });

    it('does not advance the cursor', () => {
      let calls = 0;
      return propertyTest((cursor) => {
        calls++;
        cursor.delete();
      }).then(() => {
        expect(calls).to.equal(1);
      });
    });
  });

  describe('#iterate', () => {
    it('does not call callback if nothing to iterate over', () => {
      let calls = 0;
      return test((store) => {
        return store.clear().then(() => {
          return store.openCursor().iterate((cursor) => {
            calls++;
            cursor.continue();
            return calls;
          });
        });
      }).then((results) => {
        expect(results).to.deep.equal([]);
      });
    });

    it('calls for every record', () => {
      let calls = 0;
      return test((store) => {
        return store.openCursor().iterate((cursor) => {
          calls++;
          cursor.continue();
        });
      }).then(() => {
        expect(calls).to.equal(9);
      });
    });

    it('ends calls if cursor does not advance', () => {
      let calls = 0;
      return test((store) => {
        return store.openCursor().iterate(() => {
          calls++;
        });
      }).then(() => {
        expect(calls).to.deep.equal(1);
      });
    });

    it('waits for result to resolve before continuing', () => {
      let complete = false;
      let calls = 0;
      return test((store) => {
        return store.openCursor().iterate((cursor) => {
          if (calls) {
            expect(complete).to.be.true();
            return;
          }
          calls++;
          cursor.delete().then(() => {
            complete = true;
          });
          cursor.continue();
        });
      }).then(() => {
        expect(calls).to.deep.equal(1);
      });
    });

    it('rejects with thrown error', () => {
      return expect(test((store) => {
        return store.openCursor().iterate(() => {
          throw Error('test');
        });
      })).to.eventually.be.rejectedWith('test');
    });

    it('resolves with the resolved results array', () => {
      return test((store) => {
        return store.openCursor().iterate((cursor) => {
          const i = cursor.value.i;
          return cursor.delete().then(() => {
            cursor.continue();
            return i;
          });
        });
      }).then((results) => {
        expect(results).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });
    });

    describe('if the cursor does not advance', () => {
      it('still adds the result to the results array', () => {
        return test((store) => {
          return store.openCursor().iterate((cursor) => {
            return cursor.value.i;
          });
        }).then((results) => {
          expect(results).to.deep.equal([1]);
        });
      });
    });

    describe('#continue', () => {
      it('advances cursor 1 step', () => {
        return test((store) => {
          return store.openCursor().iterate((cursor) => {
            const i = cursor.value.i;
            return cursor.delete().then(() => {
              cursor.continue();
              return i;
            });
          });
        }).then((results) => {
          expect(results).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
      });
    });

    describe('#advance', () => {
      it('advances cursor X steps', () => {
        return test((store) => {
          return store.openCursor().iterate((cursor) => {
            const i = cursor.value.i;
            return cursor.delete().then(() => {
              cursor.advance(2);
              return i;
            });
          });
        }).then((results) => {
          expect(results).to.deep.equal([1, 3, 5, 7, 9]);
        });
      });
    });
  });

  describe('#while', () => {
    it('does not call callback if nothing to iterate over', () => {
      let calls = 0;
      return test((store) => {
        return store.clear().then(() => {
          return store.openCursor().while(() => {
            calls++;
            return calls;
          });
        });
      }).then((results) => {
        expect(results).to.deep.equal([]);
      });
    });

    it('calls for every record', () => {
      let calls = 0;
      return test((store) => {
        return store.openCursor().while(() => {
          calls++;
        });
      }).then(() => {
        expect(calls).to.equal(9);
      });
    });

    it('waits for result to resolve before continuing', () => {
      let complete = false;
      let calls = 0;
      return test((store) => {
        return store.openCursor().while((cursor) => {
          if (calls) {
            expect(complete).to.be.true();
            return false;
          }
          calls++;
          cursor.delete().then(() => {
            complete = true;
          });
          return true;
        });
      }).then(() => {
        expect(calls).to.deep.equal(1);
      });
    });

    it('rejects with thrown error', () => {
      return expect(test((store) => {
        return store.openCursor().while(() => {
          throw Error('test');
        });
      })).to.eventually.be.rejectedWith('test');
    });

    it('resolves with the resolved results array', () => {
      return test((store) => {
        return store.openCursor().while((cursor) => {
          const i = cursor.value.i;
          return cursor.delete().then(() => {
            return i;
          });
        });
      }).then((results) => {
        expect(results).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });
    });

    describe('if cursor does not advance', () => {
      it('continues automatically', () => {
        let calls = 0;
        return test((store) => {
          return store.openCursor().while(() => {
            calls++;
          });
        }).then(() => {
          expect(calls).to.equal(9);
        });
      });

      describe('if false is returned', () => {
        it('stops iteration', () => {
          let calls = 0;
          return test((store) => {
            return store.openCursor().while(() => {
              calls++;
              return calls < 2;
            });
          }).then(() => {
            expect(calls).to.equal(2);
          });
        });

        it('does not add result to results array', () => {
          let calls = 0;
          return test((store) => {
            return store.openCursor().while(() => {
              calls++;
              return calls < 2;
            });
          }).then((results) => {
            expect(results).to.deep.equal([true]);
          });
        });
      });
    });

    describe('if cursor advances', () => {
      it('does not advance again', () => {
        let calls = 0;
        return test((store) => {
          return store.openCursor().while((cursor) => {
            calls++;
            cursor.continue();
          });
        }).then(() => {
          expect(calls).to.equal(9);
        });
      });

      describe('if false is returned', () => {
        it('does not stop iteration', () => {
          let calls = 0;
          return test((store) => {
            return store.openCursor().while((cursor) => {
              calls++;
              cursor.continue();
              return false;
            });
          }).then(() => {
            expect(calls).to.equal(9);
          });
        });

        it('adds result to results array', () => {
          let calls = 0;
          return test((store) => {
            return store.openCursor().while((cursor) => {
              calls++;
              if (calls < 2) {
                cursor.continue();
              }
              return false;
            });
          }).then((results) => {
            expect(results).to.deep.equal([false]);
          });
        });
      });
    });


    describe('#continue', () => {
      it('advances cursor 1 step', () => {
        return test((store) => {
          return store.openCursor().while((cursor) => {
            const i = cursor.value.i;
            return cursor.delete().then(() => {
              cursor.continue();
              return i;
            });
          });
        }).then((results) => {
          expect(results).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
      });
    });

    describe('#advance', () => {
      it('advances cursor X steps', () => {
        return test((store) => {
          return store.openCursor().while((cursor) => {
            const i = cursor.value.i;
            return cursor.delete().then(() => {
              cursor.advance(2);
              return i;
            });
          });
        }).then((results) => {
          expect(results).to.deep.equal([1, 3, 5, 7, 9]);
        });
      });
    });
  });
});
