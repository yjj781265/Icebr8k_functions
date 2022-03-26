/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import {v4 as uuidv4} from 'uuid';
import {firestore} from 'firebase-admin';

export class Counter {
  static async incrementBy(doc: firestore.DocumentReference, field: string, val: number): Promise<void> {
    const shardId = uuidv4();
    const increment: any = firestore.FieldValue.increment(val);
    const update: { [key: string]: any } = field
        .split('.')
        .reverse()
        .reduce((value, name) => ({[name]: value}), increment);
    await doc.collection('_counter_shards_').doc(shardId).set(update, {merge: true});
  }
}
