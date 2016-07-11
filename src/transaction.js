import ObjectStore from './object-store';
import SyncPromise from './sync-promise';
import { recoverWith, rejectWithError } from './util';

export default class Transaction {
  constructor(transaction, db) {
    this.transaction = transaction;
    this.db = db;

    this.promise = new SyncPromise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = rejectWithError(reject);
    });
  }

  get mode() {
    return this.transaction.mode;
  }

  get objectStoreNames() {
    return this.transaction.objectStoreNames;
  }

  get onabort() {
    return this.transaction.onabort;
  }

  set onabort(handler) {
    this.transaction.onabort = handler;
  }

  abort() {
    this.transaction.abort();
  }

  objectStore(name) {
    return new ObjectStore(this.transaction.objectStore(name), this);
  }

  run(callback) {
    return new SyncPromise((resolve) => {
      resolve(callback(this));
    }).then((result) => {
      return this.promise.then((completion) => {
        return result;
      });
    }, (error) => {
      this.abort();
      throw error;
    });
  }
}
