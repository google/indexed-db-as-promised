import ObjectStore from './object-store';
import SyncPromise from './sync-promise';
import { recoverWith, rejectWithError } from './util';

export default class Transaction {
  constructor(transaction, db, { aborted }) {
    this.transaction = transaction;
    this.db = db;
    this.sentinel = {};

    this.promise = new SyncPromise((resolve, reject) => {
      transaction.oncomplete = () => resolve(this.sentinel);
      transaction.onerror = rejectWithError(reject);
      transaction.onabort = aborted ?
        recoverWith(resolve, aborted) :
        rejectWithError(reject);
    });
  }

  get mode() {
    return this.transaction.mode;
  }

  get objectStoreNames() {
    return this.transaction.objectStoreNames;
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
        return completion === this.sentinel ? result : completion;
      });
    }, (error) => {
      this.abort();
      throw error;
    });
  }
}
