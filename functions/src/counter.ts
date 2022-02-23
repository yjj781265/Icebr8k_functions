/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import * as uuid from 'uuid';
import {firestore} from 'firebase-admin/lib/firestore';

export class Counter {
  static async incrementBy(doc: firestore.DocumentReference, field: string, val: number): Promise<void> {
    const shardId = uuid.v4();
    const increment: any = firestore.FieldValue.increment(val);
    const update: { [key: string]: any } = field
        .split('.')
        .reverse()
        .reduce((value, name) => ({[name]: value}), increment);
    await doc.collection('_counter_shards_').doc(shardId).set(update, {merge: true});
  }
}
