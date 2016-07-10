import indexedDB from 'fake-indexeddb';
import FDBRequest from 'fake-indexeddb/lib/FDBRequest';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

// Wire it to the Global, so that the library uses it.
global.indexedDB = indexedDB;
global.IDBRequest = FDBRequest;
global.IDBKeyRange = FDBKeyRange;

export default indexedDB;
