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
      const tagIds: string[] = snapshot.data().tagIds;
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
        await handleTagQuestionCount(true, tagIds);
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
      const tagIds: string[] = snapshot.data().tagIds;
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
        await handleTagQuestionCount(false, tagIds);
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

export const commentReplyAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{commentId}/Comments-Replies${dbSuffix}/{replyId}`)
    .onCreate(async (snapshot) => {
      console.log('commentLikeAddTriggerDev');
      const commentId: string = snapshot.data().commentId;
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const commentRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(questionId).collection(`Comments${dbSuffix}`).doc(commentId);

      if (!(await commentRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + comment reply count
      try {
        Counter.incrementBy(commentRef, 'replies', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentReplyDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{uid}/Comments-Replies${dbSuffix}/{documentId}`)
    .onDelete(async (snapshot) => {
      console.log('commentLikeDeleteTriggerDev');
      const commentId: string = snapshot.data().commentId;
      const questionId: string | undefined | null = snapshot.data().questionId;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const commentRef = admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(questionId).collection(`Comments${dbSuffix}`).doc(commentId);

      if (!(await commentRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // - comment reply count
      try {
        Counter.incrementBy(commentRef, 'replies', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const notificationAddDev = functions.firestore
    .document(`IbUsers${dbSuffix}/{docId}/IbNotifications${dbSuffix}/{notificationId}`)
    .onCreate(async (snapshot) => {
      console.log('notificationAddDev');
      const isRead : boolean = snapshot.data().isRead;
      const recipientId: string = snapshot.data().recipientId;

      if (isRead) {
        return;
      }

      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(recipientId);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment +1');
      }

      // + notificationCount
      try {
        Counter.incrementBy(userRef, 'notificationCount', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const notificationDeleteDev = functions.firestore
    .document(`IbUsers${dbSuffix}/{docId}/IbNotifications${dbSuffix}/{notificationId}`)
    .onDelete(async (snapshot) => {
      console.log('notificationDeleteDev');
      const recipientId: string = snapshot.data().recipientId;

      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(recipientId);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, decrement counter');
      }

      // - notificationCount
      try {
        Counter.incrementBy(userRef, 'notificationCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const notificationUpdateDev = functions.firestore
    .document(`IbUsers${dbSuffix}/{docId}/IbNotifications${dbSuffix}/{notificationId}`)
    .onUpdate(async (snapshot) => {
      console.log('notificationUpdateDev');
      const isReadBefore : boolean = snapshot.before.data().isRead;
      const isReadAfter : boolean = snapshot.after.data().isRead;
      const recipientId: string = snapshot.after.data().recipientId;

      if ((isReadBefore && isReadAfter)||(!isReadAfter && !isReadBefore)) {
        return;
      }

      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(recipientId);

      if (!(await userRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, update counter');
      }

      // +- notificationCount
      try {
        if (isReadBefore && !isReadAfter) {
          Counter.incrementBy(userRef, 'notificationCount', 1);
        } else {
          Counter.incrementBy(userRef, 'notificationCount', -1);
        }
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const chatMemberAddDev = functions.firestore
    .document(`IbChats${dbSuffix}/{chatId}/IbMembers${dbSuffix}/{memberId}`)
    .onCreate(async ( snapshot, context) => {
      console.log('chatMemeberAddDev');
      const chatId :string = context.params.chatId;
      const memberId : string = context.params.memberId;

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

      // update member uid array, and increment member count
      try {
        const ibChatSnapshot = await chatRef.get();
        if (snapshot.exists) {
          const memberUids : string[] = ibChatSnapshot.data()!['memberUids'];
          memberUids.push(memberId);
          memberUids.sort();
          console.log(`sorted array: ${memberUids}`);
          await chatRef.update({'memberUids': memberUids});
          Counter.incrementBy(chatRef, 'memberCount', 1);
        }
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

      if (!(await chatRef.get()).exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, update chat');
      }

      // update member uid array, and decrement member count
      try {
        const ibChatSnapshot = await chatRef.get();
        if (snapshot.exists) {
          const memberUids : string[] = ibChatSnapshot.data()!['memberUids'];
          memberUids.forEach((value, index) =>{
            if (value == memberId) {
              memberUids.splice(index, 1);
            }
          });
          memberUids.sort();
          console.log(`sorted array: ${memberUids}`);
          await chatRef.update({'memberUids': memberUids});
          Counter.incrementBy(chatRef, 'memberCount', -1);
        }
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
 * Adds two numbers together.
 * @param {boolean} isIncrement add or decrease count by 1.
 * @param {string[]} tagIds array of tagIds.
 */
async function handleTagQuestionCount(isIncrement: boolean, tagIds: string[] ) {
  for (let i=0; i<tagIds.length; i++) {
    const id = tagIds[i];
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
