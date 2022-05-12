/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import {v4 as uuidv4} from 'uuid';
import * as admin from 'firebase-admin';

export class utils {
  static async updateCounter(doc: admin.firestore.DocumentReference, field: string, val: number): Promise<void> {
    const shardId = uuidv4();
    const increment: any = admin.firestore.FieldValue.increment(val);
    const update: { [key: string]: any } = field
        .split('.')
        .reverse()
        .reduce((value, name) => ({[name]: value}), increment);
    await doc.collection('_counter_shards_').doc(shardId).set(update, {merge: true});
  }

  /**
 * @param {string} body text for the body
 * @param {string} url place to put doc id or imageUrl depends on the type
 * @param {string} type type of notification
 * @param {any} timestamp the timestamp
 * @param {boolean}isRead is notificaiton read by user or not
 * @param {string} senderId uid of the sender
 * @param {string} recipientId uid of the recipient
 * @param {boolean} dbSuffix database suffix:-dev,-beta,or -prod.
 */
  static async addNotification( body: string = '', url: string ='',
      type:string, timestamp:any = admin.firestore.FieldValue.serverTimestamp(),
      isRead:boolean = false, senderId:string, recipientId:string, dbSuffix:string) {
    if (senderId == recipientId) {
      console.log('senderid and recipientId are the same ignore this notification');
      return;
    }

    const id = uuidv4();
    await admin.firestore().collection(`IbUsers${dbSuffix}`).doc(recipientId).collection(`IbNotifications${dbSuffix}`).doc(id)
        .set({'id': id, 'body': body, 'url': url, 'timestamp': timestamp, 'isRead': isRead, 'type': type, 'senderId': senderId, 'recipientId': recipientId}, {merge: true});
    console.log('addNotification added!');
  }

  /**
 * @param {string[]} uids the user ids that need to send notification to.
 * @param {Map<string,string>} data hold key values such as senderUid,receiverUid,notification type,attachmentUrl.
 * @param {string} body the body of notification.
 * @param {string} title the title of notification.
 * @param {boolean} incrementCount to increment notification count.
 * @param {boolean} dbSuffix database suffix:-dev,-beta,or -prod.
 */
  static async sendPushNotifications(uids: string[], data:{[key: string]: string}, body:string, title:string, incrementCount:boolean, dbSuffix:string ) {
    if (uids.length == 0) {
      return;
    }

    try {
      for (const uid of uids) {
        const userDoc = await admin
            .firestore()
            .collection(`IbUsers${dbSuffix}`)
            .doc(uid.toString()).get();
        if (userDoc.exists) {
          let token:string|undefined = userDoc.data()!.fcmToken;
          token = token == undefined ? '':token;
          const timestamp:{[key: string]: number} = userDoc.data()!.fcmTokenTimestamp;
          const secs: number = timestamp._seconds;
          const now = new Date();
          const diff:number = (now.getTime()/1000) - secs;
          const days:number = diff /86400;
          if (days>180) {
          // token is stale
            await admin.messaging().unsubscribeFromTopic(token, `Users${dbSuffix}`);
            await userDoc.ref.update({'fcmToken': ''});
            console.warn(`${uid} token is stale, removing from fcm`);
            continue;
          }

          let notificationCount: number|undefined = userDoc.data()!.notificationCount;
          notificationCount = notificationCount == undefined ? 0 :notificationCount;

          if (token == '') {
            continue;
          }

          if (incrementCount) {
            await admin
                .firestore()
                .collection(`IbUsers${dbSuffix}`)
                .doc(uid.toString()).update({'notificationCount': admin.firestore.FieldValue.increment(1)});
          }

          const androidNotification = {'body': body, 'notificationCount': notificationCount, 'title': title};
          const message = {'android': {'data': data, 'notification': androidNotification}, 'tokens': [token]};
          await admin.messaging().sendMulticast(message);
        }
      }
    } catch (e) {
      console.log('sendNotifications failed', e);
    }
  }
}


