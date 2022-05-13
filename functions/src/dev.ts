/* eslint-disable max-len */
/*  Cloud function for Icebr8k dev envrioment,
it only talks to Firebase with collection has -dev suffix
*/

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import './utils';
import {utils} from './utils';

const dbSuffix = '-dev';
const kFriendRequest: string = 'friend_request';
const kCircleInvite:string = 'circle_invite';
const kCircleRequest:string = 'circle_request';
const kPollComment:string = 'poll_comment';
const kNewVote:string = 'new_vote';
const kPollLike:string = 'new_like_poll';
const kPollCommentLike:string = 'new_like_comment';

admin.initializeApp();

export const answerAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Answers${dbSuffix}/{uid}`)
    .onCreate(async (snapshot) => {
      console.log('answerAddTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      const choiceId: string = snapshot.data().choiceId;
      const isAnonymous: boolean = snapshot.data().isAnonymous;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionDoc = await admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`).get();

      if (!questionDoc.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + poll and choice count and notify user new vote if answer is not Anonymous
      try {
        utils.updateCounter(questionDoc.ref, 'pollSize', 1);
        utils.updateCounter(questionDoc.ref, 'points', 1);
        utils.updateCounter(questionDoc.ref, choiceId, 1);
        const receiverUid: string = questionDoc.data()!.creatorId;

        if (!isAnonymous) {
          await utils.addNotification('', '', kNewVote,
              admin.firestore.FieldValue.serverTimestamp(),
              false, snapshot.ref.id, receiverUid, dbSuffix);
        }
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
        utils.updateCounter(userRef, 'answeredCount', 1);
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
        utils.updateCounter(questionRef, beforeChoiceId, -1);
        utils.updateCounter(questionRef, afterChoiceId, 1);
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
        utils.updateCounter(questionRef, 'pollSize', -1);
        utils.updateCounter(questionRef, 'points', -1);
        utils.updateCounter(questionRef, choiceId, -1);
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
        utils.updateCounter(userRef, 'answeredCount', -1);
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

        utils.updateCounter(userRef, 'askedCount', 1);
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
        utils.updateCounter(userRef, 'askedCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{commentId}`)
    .onCreate(async (snapshot) => {
      console.log('commentAddTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      const notifyUid: string = snapshot.data().notifyUid;
      const uid: string = snapshot.data().uid;
      const commentId: string = snapshot.data().commentId;
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
      // + comment size and notify question creator that new comment is added
      try {
        utils.updateCounter(questionRef, 'comments', 1);
        utils.updateCounter(questionRef, 'points', 2);
        utils.addNotification(' ', commentId, kPollComment,
            admin.firestore.FieldValue.serverTimestamp(), false, uid, notifyUid, dbSuffix);
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
        utils.updateCounter(questionRef, 'comments', -1);
        utils.updateCounter(questionRef, 'points', -2);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const likeAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Likes${dbSuffix}/{uid}`)
    .onCreate(async (snapshot) => {
      console.log('likeAddTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      const senderId: string = snapshot.data().uid;
      if (questionId == null || questionId == undefined) {
        return;
      }

      const questionDoc = await admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`).get();


      if (!questionDoc.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + like count and notify question creator about the like
      try {
        utils.updateCounter(questionDoc.ref, 'likes', 1);
        utils.updateCounter(questionDoc.ref, 'points', 1);
        const recipientId = questionDoc.data()!.creatorId;
        utils.addNotification('', questionId, kPollLike,
            admin.firestore.FieldValue.serverTimestamp(), false, senderId, recipientId, dbSuffix);
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
        utils.updateCounter(questionRef, 'likes', -1);
        utils.updateCounter(questionRef, 'points', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentLikeAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{id}/Comments-Likes${dbSuffix}/{documentId}`)
    .onCreate(async (snapshot) => {
      console.log('commentLikeAddTriggerDev');
      const commentId: string | undefined | null = snapshot.data().commentId;
      const questionId: string | undefined | null = snapshot.data().questionId;
      const senderId: string = snapshot.data().uid;
      if (commentId == null || commentId == undefined) {
        return;
      }

      const commentDoc = await admin
          .firestore()
          .collection(`IbQuestions${dbSuffix}`)
          .doc(`${questionId}`).collection(`Comments${dbSuffix}`).doc(`${commentId}`).get();
      if (!commentDoc.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment +1');
      }

      // + comment like count and notify comment creator
      try {
        utils.updateCounter(commentDoc.ref, 'likes', 1);
        const notifyUid: string = commentDoc.data()!.notifyUid;
        utils.addNotification('', commentId, kPollCommentLike,
            admin.firestore.FieldValue.serverTimestamp(), false, senderId, notifyUid, dbSuffix);
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
        utils.updateCounter(commentRef, 'likes', -1);
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
      if (isRead) {
        return;
      }

      const userDoc = await admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(senderId).get();

      const recipientDoc = await admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(recipientId).get();
      if (!userDoc.exists || !recipientDoc.exists) {
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
        const settings = await recipientDoc.data()!.settings;
        if (senderUsername == undefined) {
          return;
        }
        title = senderUsername;
        if (kFriendRequest == type && (settings.friendRequestN || settings == undefined)) {
          body = 'Send you a friend request';
        } else if (kCircleInvite == type && (settings.circleInviteN || settings == undefined)) {
          body = 'Invited you to a circle';
        } else if (kCircleRequest == type && (settings.circleRequestN || settings == undefined) ) {
          body = 'Send a request to join a circle';
        } else if (kPollComment == type && (settings.pollCommentN || settings == undefined)) {
          body = 'Added a new comment on one of your polls';
        } else if (kPollCommentLike == type && (settings.pollCommentLikesN || settings == undefined)) {
          body = 'Liked one of your comments on a poll';
        } else if (kPollLike == type && (settings.pollLikesN|| settings == undefined)) {
          body = 'Liked one of your polls';
        } else if (kNewVote == type && (settings.pollVoteN || settings == undefined)) {
          body = 'Just voted on one of your polls';
        } else {
          return;
        }
        await utils.sendPushNotifications([recipientId], {'type': type, 'notificationId': id, 'url': url}, body, title, false, dbSuffix);
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
        await utils.updateCounter(chatRef, 'memberCount', 1);
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
        await utils.updateCounter(chatRef, 'memberCount', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const chatMsgAddDev = functions.firestore
    .document(`IbChats${dbSuffix}/{chatId}/IbMessages${dbSuffix}/{messageId}`)
    .onCreate(async ( snapshot, context) => {
      console.log('chatLastMsgUpdateDev');
      const chatId :string = context.params.chatId;
      const chatDoc = await admin
          .firestore()
          .collection(`IbChats${dbSuffix}`)
          .doc(chatId).get();

      if (!chatDoc.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, update chat');
      }

      // update lastmessage , message count and notify members;
      try {
        await chatDoc.ref.update({'lastMessage': snapshot.data()});
        await utils.updateCounter(chatDoc.ref, 'messageCount', 1);
        await utils.handleMessageAdd(chatDoc, snapshot.data(), dbSuffix);
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
        utils.updateCounter(chatRef, 'messageCount', -1);
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
      utils.updateCounter(tagRef, 'questionCount', 1 );
    } else {
      utils.updateCounter(tagRef, 'questionCount', -1 );
    }
  }
}


