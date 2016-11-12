# indexed-db-as-promised [![Build Status](https://travis-ci.org/google/indexed-db-as-promised.svg)](https://travis-ci.org/google/indexed-db-as-promised)
[![npm version](https://badge.fury.io/js/indexed-db-as-promised.svg)](http://badge.fury.io/js/indexed-db-as-promised)

A thin wrapper around IndexedDB, making it much more pleasant to use by
returning Promise-likes. Inspired by ideas in
[indexeddb-promised](https://github.com/jakearchibald/indexeddb-promised),
but written with the `SyncPromise` library to avoid issues with the transaction
lifetime.

This is not an official Google product.

## Installation

```
npm install --save indexed-db-as-promised
```

## Usage

The APIs mirror native IndexedDB's, just returning a promise-like everywhere
you would want one.

```javascript
import indexedDBP from "indexed-db-as-promised";

indexedDBP.open('database', 1, {
  upgrade(db, { transaction, oldVersion, newVersion }) {
    const people = db.createObjectStore('people', { autoIncrement: true, keyPath: 'id' });
    people.createIndex('ssn', 'ssn', { unique: true });
    people.createIndex('lastName', 'last');

    people.add({ first: 'Jane', last: 'Smith', ssn: '111-11-1111' });
  }
}).then((db) => {
  // Get the Jane's record
  return db.transaction('people').run((tx) => {
    // #run returns a Promise like that will resolve to whatever we return in
    // this block.
    const ssn = tx.objectStore('people').index('ssn');
    return ssn.get('111-11-1111');
  }).then((record) => {
    console.log(record); // => { first: 'Jane', last: 'Smith', ssn: '111-11-1111' }

    // Let's add someone, then get the total number of Smiths.
    return db.transaction('people', 'readwrite').run((tx) => {

      const store = tx.objectStore('people');
      return store.put({ first: 'John', last: 'Smith', ssn: '111-11-1112' })
        .then((key) => {
          console.log(key); // => 2

          return store.index('lastName').count(IDBKeyRange.only('Smith'));
        });
    });
  }).then((count) => {
    console.log(count); // => 2

    // Let's iterate over everyone.
    return db.transaction('people').run((tx) => {

      // Let's gather all our SSNs with a cursor.
      const open = tx.objectStore('people').openCursor();
      return open.iterate((cursor) => {
        const record = cursor.value;

        // Continue/advance (if you want to), or don't and early-exit iteration.
        cursor.continue();

        return record.ssn;
      }).then((ssns) => {
        console.log(ssns); // => ['111-11-1111', '111-11-1112']
      });
    });
  }).then(() => {
    // Let's close our connection now.
    db.close();
  });
});
```

## License

Apache 2.0
