/* eslint-disable max-len */
/*  Cloud function for Icebr8k dev envrioment,
it only talks to Firebase with collection has -dev suffix
*/

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import './counter';
import {Counter} from './counter';

const dbSuffix = '-dev';

admin.initializeApp();

export const answerAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Answers${dbSuffix}/{uid}`)
    .onCreate(async (snapshot) => {
      console.log('answerAddTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      const choiceId: string = snapshot.data().choiceId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + poll and choice count
      try {
        Counter.incrementBy(questionRef, 'pollSize', 1);
        Counter.incrementBy(questionRef, 'points', 1);
        Counter.incrementBy(questionRef, choiceId, 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }

      const uid: string | undefined | null = snapshot.data().uid;
      if (uid == null || uid == undefined) {
        return;
      }

      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(`${uid}`);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // update user answered size
      try {
        Counter.incrementBy(userRef, 'answeredCount', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const answerUpdateTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Answers${dbSuffix}/{uid}`)
    .onUpdate(async (snapshot) => {
      console.log('answerUpdateTriggerDev');
      const questionId: string | undefined | null = snapshot.after.data().questionId;
      const beforeChoiceId: string = snapshot.before.data().choiceId;
      const afterChoiceId: string = snapshot.after.data().choiceId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // update choice count
      try {
        Counter.incrementBy(questionRef, beforeChoiceId, -1);
        Counter.incrementBy(questionRef, afterChoiceId, 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const answerDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Answers${dbSuffix}/{uid}`)
    .onDelete(async (snapshot) => {
      console.log('answerDeleteTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      const choiceId: string = snapshot.data().choiceId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - poll size
      try {
        Counter.incrementBy(questionRef, 'pollSize', -1);
        Counter.incrementBy(questionRef, 'points', -1);
        Counter.incrementBy(questionRef, choiceId, -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }

      const uid: string | undefined | null = snapshot.data().uid;
      if (uid == null || uid == undefined) {
        return;
      }


      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(`${uid}`);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - user answered size
      try {
        Counter.incrementBy(userRef, 'answeredCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const questionAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}`)
    .onCreate(async (snapshot) => {
      console.log('questionAddTriggerDev');
      const creatorId: string | undefined | null = snapshot.data().creatorId;
      const isPublic: boolean = snapshot.data().isPublic;
      const tags: string[] = snapshot.data().tags;
      if (creatorId == null || creatorId == undefined) {
        return;
      }


      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(`${creatorId}`);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + user asked size
      try {
        if (isPublic) {
          await handleTagQuestionCount(true, tags);
        }

        Counter.incrementBy(userRef, 'askedCount', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const questionDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}`)
    .onDelete(async (snapshot) => {
      console.log('questionDeleteTriggerDev');
      const creatorId: string | undefined | null = snapshot.data().creatorId;
      const isPublic: boolean = snapshot.data().isPublic;
      const tags: string[] = snapshot.data().tags;
      if (creatorId == null || creatorId == undefined) {
        return;
      }
      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(`${creatorId}`);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - user asked size
      try {
        if (isPublic) {
          await handleTagQuestionCount(true, tags);
        }
        await handleTagQuestionCount(false, tags);
        Counter.incrementBy(userRef, 'askedCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{uid}`)
    .onCreate(async (snapshot) => {
      console.log('commentAddTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }
      // + comment size
      try {
        Counter.incrementBy(questionRef, 'comments', 1);
        Counter.incrementBy(questionRef, 'points', 2);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{commentId}`)
    .onDelete(async (snapshot) => {
      console.log('commentDeleteTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - comment size
      try {
        Counter.incrementBy(questionRef, 'comments', -1);
        Counter.incrementBy(questionRef, 'points', -2);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const likeAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Likes${dbSuffix}/{uid}`)
    .onCreate(async (snapshot) => {
      console.log('likeAddTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + like count
      try {
        Counter.incrementBy(questionRef, 'likes', 1);
        Counter.incrementBy(questionRef, 'points', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const likeDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Likes${dbSuffix}/{uid}`)
    .onDelete(async (snapshot) => {
      console.log('likeDeleteTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`);

      if (!(await questionRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - like count
      try {
        Counter.incrementBy(questionRef, 'likes', -1);
        Counter.incrementBy(questionRef, 'points', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentLikeAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{uid}/Comments-Likes${dbSuffix}/{documentId}`)
    .onCreate(async (snapshot) => {
      console.log('commentLikeAddTriggerDev');
      const commentId: string | undefined | null = snapshot.data().commentId;
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (commentId == null || commentId == undefined) {
        return;
      }

      const commentRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`).collection(`Comments${dbSuffix}`).doc(`${commentId}`);
      if (!(await commentRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + comment like count
      try {
        Counter.incrementBy(commentRef, 'likes', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentLikeDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{uid}/Comments-Likes${dbSuffix}/{documentId}`)
    .onDelete(async (snapshot) => {
      console.log('commentLikeDeleteTriggerDev');
      const commentId: string | undefined | null = snapshot.data().commentId;
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (commentId == null || commentId == undefined) {
        return;
      }

      const commentRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`).collection(`Comments${dbSuffix}`).doc(`${commentId}`);

      if (!(await commentRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - comment like count
      try {
        Counter.incrementBy(commentRef, 'likes', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const notificationAddDev = functions.firestore
    .document(`IbUsers${dbSuffix}/{docId}/IbNotifications${dbSuffix}/{notificationId}`)
    .onCreate(async (snapshot) => {
      console.log('notificationAddDev');
      const isRead : boolean = snapshot.data().isRead;
      const type: string = snapshot.data().type;
      const url: string = snapshot.data().url;
      const senderId: string = snapshot.data().senderId;
      const recipientId: string = snapshot.data().recipientId;
      const id: string = snapshot.data().id;
      const kFriendRequest: string = 'friend_request';
      const kCircleInvite:string = 'circle_invite';
      const kCircleRequest:string = 'circle_request';
      const kPollComment:string = 'poll_comment';
      const kNewVote:string = 'new_vote';
      const kPollLike:string = 'new_like_poll';
      const kPollCommentLike:string = 'new_like_comment';

      if (isRead) {
        return;
      }

      const userDoc = await admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(senderId).get();

      if (!userDoc.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist');
      }

      // sendNotification
      try {
        let title:string = '';
        let body:string = '';
        const senderUsername = await userDoc.data()!.username;
        const settings:{[key: string]: boolean} = await userDoc.data()!.settings;
        if (senderUsername == undefined) {
          return;
        }
        title = senderUsername;
        if (kFriendRequest == type) {
          body = 'Send you a friend request';
        } else if (kCircleInvite == type && settings.circleInviteN) {
          body = 'Invited you to a circle';
        } else if (kCircleRequest == type && settings.circleRequestN ) {
          body = 'Requested to join a circle';
        } else if (kPollComment == type && settings.pollCommentN) {
          body = 'Added a new comment on one of your polls';
        } else if (kPollCommentLike == type && settings.pollCommentLikesN) {
          body = 'Liked one of your comments on a poll';
        } else if (kPollLike == type && settings.pollLikesN) {
          body = 'Liked one of your polls';
        } else if (kNewVote == type && settings.pollVoteN) {
          body = 'Just voted one of your polls';
        } else {
          return;
        }
        await sendNotifications([recipientId], {'type': type, 'id': id, 'url': url}, body, title, false);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const chatMemberAddDev = functions.firestore
    .document(`IbChats${dbSuffix}/{chatId}/IbMembers${dbSuffix}/{memberId}`)
    .onCreate(async (_, context) => {
      console.log('chatMemeberAddDev');
      const chatId :string = context.params.chatId;
      const memberId : string = context.params.memberId;

      const chatRef = admin
          .firestore()
          .collection(`IbChats${dbSuffix}`)
          .doc(chatId);

      const ibChatSnapshot = await chatRef.get();

      if (!ibChatSnapshot.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, update chat');
      }

      // update member uid array, and increment member count
      try {
        await chatRef.update({'memberUids': admin.firestore.FieldValue.arrayUnion(memberId)});
        Counter.incrementBy(chatRef, 'memberCount', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const chatMemberDeleteDev = functions.firestore
    .document(`IbChats${dbSuffix}/{chatId}/IbMembers${dbSuffix}/{memberId}`)
    .onDelete(async ( snapshot, context) => {
      console.log('chatMemeberDeleteDev');
      const chatId :string = context.params.chatId;
      const memberId : string = context.params.memberId;

      const chatRef = admin
          .firestore()
          .collection(`IbChats${dbSuffix}`)
          .doc(chatId);
      const ibChatSnapshot = await chatRef.get();
      if (!ibChatSnapshot.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, update chat');
      }

      // update member uid array, and decrement member count
      try {
        await chatRef.update({'memberUids': admin.firestore.FieldValue.arrayRemove(memberId)});
        Counter.incrementBy(chatRef, 'memberCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const chatMsgAddDev = functions.firestore
    .document(`IbChats${dbSuffix}/{chatId}/IbMessages${dbSuffix}/{messageId}`)
    .onCreate(async ( snapshot, context) => {
      console.log('chatLastMsgUpdateDev');
      const chatId :string = context.params.chatId;
      const chatRef = admin
          .firestore()
          .collection(`IbChats${dbSuffix}`)
          .doc(chatId);

      if (!(await chatRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, update chat');
      }

      // update lastmessage and message count;
      try {
        await chatRef.update({'lastMessage': snapshot.data()});
        Counter.incrementBy(chatRef, 'messageCount', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const chatMsgDeleteDev = functions.firestore
    .document(`IbChats${dbSuffix}/{chatId}/IbMessages${dbSuffix}/{messageId}`)
    .onDelete(async ( snapshot, context) => {
      console.log('chatMsgDeleteDev');
      const chatId :string = context.params.chatId;
      const chatRef = admin
          .firestore()
          .collection(`IbChats${dbSuffix}`)
          .doc(chatId);

      if (!(await chatRef.get()).exists) {
        console.warn('document does not exist, failed to decrement');
        return;
      } else {
        console.info('document does exist, update chat');
      }

      // update message count;
      try {
        Counter.incrementBy(chatRef, 'messageCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });


/**
 * @param {boolean} isIncrement add or decrease count by 1.
 * @param {string[]} tags array of tags.
 */
async function handleTagQuestionCount(isIncrement: boolean, tags: string[] ) {
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
      Counter.incrementBy(tagRef, 'questionCount', 1 );
    } else {
      Counter.incrementBy(tagRef, 'questionCount', -1 );
    }
  }
}

/**
 * @param {string[]} uids the user ids that need to send notification to.
 * @param {Map<string,string>} data hold key values such as senderUid,receiverUid,notification type,attachmentUrl.
 * @param {string} body the body of notification.
 * @param {string} title the title of notification.
 * @param {boolean} incrementCount to increment notification count.
 */
async function sendNotifications(uids: string[], data:{[key: string]: string}, body:string, title:string, incrementCount:boolean ) {
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
