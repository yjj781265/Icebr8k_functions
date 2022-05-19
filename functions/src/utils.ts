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
 * @param {boolean} isIncrement add or decrease count by 1.
 * @param {string[]} tags array of tags.
 * @param {string} dbSuffix database env.
 */
  static async handleTagQuestionCount(isIncrement: boolean, tags: string[], dbSuffix: string ) {
    for (let i=0; i<tags.length; i++) {
      const id = tags[i];
      console.log('handleTagQuestionCount');
      const tagRef = admin
          .firestore()
          .collection(`IbTags${dbSuffix}`)
          .doc(id.toString());

      if (!(await tagRef.get()).exists) {
        console.warn('doc does not exist');
        return;
      }

      if (isIncrement) {
        await this.updateCounter(tagRef, 'questionCount', 1 );
      } else {
        await this.updateCounter(tagRef, 'questionCount', -1 );
      }
    }
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
      console.debug(`sendPushNotifications ignore, uids are empty`);
      return;
    }


    for (const uid of uids) {
      try {
        const userRef = admin
            .firestore()
            .collection(`IbUsers${dbSuffix}`)
            .doc(uid.toString());

        if (incrementCount) {
          await userRef.update({'notificationCount': admin.firestore.FieldValue.increment(1)});
        }

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


          if (token == '') {
            console.warn(`${uid} token is empty, ignore this user`);
            continue;
          }


          let notificationCount: number|undefined = userDoc.data()!.notificationCount;
          notificationCount = notificationCount == undefined ? 0 :notificationCount;
          // / for messaging API reference go to: https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.messaging.md#messagingsendmulticast

          const androidNotification = {'body': body, 'notificationCount': notificationCount,
            'title': title, 'defaultSound': false, 'sound': 'water_drop.mp3', 'channelId': 'icebr8k_custom_channel'};

          const aps = {'aps': {'alert': {'body': body, 'title': title},
            'badge': notificationCount, 'contentAvailable': false, 'sound': 'water_drop.wav'}};

          const message = {'android': {'notification': androidNotification}, 'apns': {'payload': aps}, 'data': data, 'token': token};
          admin.messaging().send(message);
          console.info(`sendNotification token msg success`);
        }
      } catch (e) {
        console.error('sendNotification failed', e);
        continue;
      }
    }
  }

  /**
 *
 * @param {FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>}chatDoc chat snapshot
 * @param {FirebaseFirestore.DocumentData}lastMessage lastMessage snapshot
 * @param {string}dbSuffix database suffix:-dev,-beta,or -prod
 */
  static async handleMessageAdd(chatDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
      , lastMessage:FirebaseFirestore.DocumentData, dbSuffix:string) {
    const senderUid:string = lastMessage.senderUid;
    const messageType:string = lastMessage.messageType;
    const memberUids:string[] = chatDoc.data()!.memberUids;
    const name:string = chatDoc.data()!.name;
    const readUids:string[] = lastMessage.readUids;
    const mutedUids:string[] = chatDoc.data()!.mutedUids;

    for (const uid of mutedUids) {
      const index = memberUids.indexOf(uid);
      if (index!=-1) {
        memberUids.splice(index, 1);
      }
    }

    for (const uid of readUids) {
      const index = memberUids.indexOf(uid);
      if (index!=-1) {
        memberUids.splice(index, 1);
      }
    }

    const index = memberUids.indexOf(senderUid);
    if (index!=-1) {
      memberUids.splice(index, 1);
    }

    if (memberUids.length!=0) {
      const userDoc = await admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(senderUid).get();
      let title:string = '';
      let body:string = '';
      const senderUsername = await userDoc.data()!.username;
      title = name.trim() == ''? senderUsername :name;
      if ('poll' == messageType) {
        body = `${senderUsername} shared a poll`;
      } else if ('icebreaker' == messageType) {
        body = `${senderUsername} shared an icebreaker`;
      } else if ('pic' == messageType) {
        body = `${senderUsername} shared an image`;
      } else if ('text' == messageType) {
        body = `${senderUsername}: ${lastMessage.content}`;
      } else {
        return;
      }

      this.sendPushNotifications(memberUids, {'type': 'chat', 'url': chatDoc.ref.id}, body, title, true, dbSuffix);
    } else {
      console.log('no uids to send notification to');
    }
  }
}


