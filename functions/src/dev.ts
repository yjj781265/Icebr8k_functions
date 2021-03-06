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
const kFriendAccepted: string = 'friend_accepted';
const kCircleInvite:string = 'circle_invite';
const kCircleRequest:string = 'circle_request';
const kProfileLiked:string = 'profile_liked';
const kPollComment:string = 'poll_comment';
const kNewVote:string = 'new_vote';
const kPoll:string = 'poll';
const kPollLike:string = 'new_like_poll';
const kPollCommentLike:string = 'new_like_comment';
const kPollCommentReply:string = 'poll_comment_reply';


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
          await utils.addNotification('', questionId, kNewVote,
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
        console.info('document does exist, increment +1');
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
      } else {
        console.info('document does exist, increment -1'); // - poll size
        try {
          utils.updateCounter(questionRef, 'pollSize', -1);
          utils.updateCounter(questionRef, 'points', -1);
          utils.updateCounter(questionRef, choiceId, -1);
        } catch (e) {
          console.log('Transaction failure:', e);
        }
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
      } else {
        console.info('document does exist, increment -1');
        // - user answered size
        try {
          utils.updateCounter(userRef, 'answeredCount', -1);
        } catch (e) {
          console.log('Transaction failure:', e);
        }
      }
    });

export const questionAddTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}`)
    .onCreate(async (snapshot) => {
      console.log('questionAddTriggerDev');
      const creatorId: string | undefined | null = snapshot.data().creatorId;
      const isPublic: boolean = snapshot.data().isPublic;
      const questionId :string = snapshot.data().id;
      const question: string = snapshot.data().question;
      const isAnonymous: boolean = snapshot.data().isAnonymous;
      const tags: string[] = snapshot.data().tags;
      const sharedFriendUids: string[] = snapshot.data().sharedFriendUids;
      if (creatorId == null || creatorId == undefined) {
        return;
      }


      const userRef = admin
          .firestore()
          .collection(`IbUsers${dbSuffix}`)
          .doc(`${creatorId}`);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.warn('document does not exist, failed to increment');
        return;
      } else {
        console.info('document does exist, increment -1');
      }

      // + user asked size
      try {
        if (isPublic) {
          await utils.handleTagQuestionCount(true, tags, dbSuffix);
        }
        utils.updateCounter(userRef, 'askedCount', 1);

        // / send push notification to sharedFriendUids
        if (!isAnonymous) {
          const username = userDoc.data()!.username;
          for (const uid of sharedFriendUids) {
            const friendDoc = await admin
                .firestore()
                .collection(`IbUsers${dbSuffix}`)
                .doc(`${uid}`).get();
            const settings = friendDoc.data()!.settings;
            if (settings.pollNewN) {
              await utils.sendPushNotifications([uid], {'type': kPoll, 'url': questionId}, question, `${username} post a new poll`, true, dbSuffix);
            }
          }
        }
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const questionUpdateTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}`)
    .onUpdate(async (snapshot) => {
      const newCreatorId: string | undefined | null = snapshot.after.data().creatorId;
      const newIsPublic: boolean = snapshot.after.data().isPublic;
      const newTags: string[] = snapshot.after.data().tags;

      const oldCreatorId: string | undefined | null = snapshot.before.data().creatorId;
      const oldIsPublic: boolean = snapshot.before.data().isPublic;
      const oldTags: string[] = snapshot.before.data().tags;


      if (newCreatorId!=oldCreatorId) {
        console.log('questionUpdateTriggerDev ignored, creator id is not the same!');
        return;
      }

      console.log('questionUpdateTriggerDev');

      if (!oldIsPublic && !newIsPublic) {
        console.log('questionUpdateTriggerDev no need to update counter on private question');
        return;
      }

      try {
        if (!oldIsPublic && newIsPublic) {
          console.log('questionUpdateTriggerDev update counter on all new tags');
          await utils.handleTagQuestionCount(true, newTags, dbSuffix);
          return;
        }

        if (oldIsPublic && !newIsPublic) {
          console.log('questionUpdateTriggerDev decrement counter on all old tags');
          await utils.handleTagQuestionCount(false, oldTags, dbSuffix);
          return;
        }

        if (oldIsPublic && newIsPublic) {
          console.log('questionUpdateTriggerDev decrement counter on oldtags and increment on new tags');
          await utils.handleTagQuestionCount(false, oldTags, dbSuffix);
          await utils.handleTagQuestionCount(true, newTags, dbSuffix);
          return;
        }
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
          await utils.handleTagQuestionCount(false, tags, dbSuffix);
        }
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

export const commentUpdateTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{commentId}`)
    .onUpdate(async (snapshot) => {
      console.log('commentUpdateTriggerDev');
      const questionId: string | undefined | null = snapshot.after.data().questionId;
      const repliesBefore: [] = snapshot.before.data().replies;
      const repliesAfter: [] = snapshot.after.data().replies;
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
        console.info('document does exist, increment 1');
      }
      // + comment size and notify question creator that new comment is added

      const diff:number = repliesAfter.length - repliesBefore.length;


      try {
        utils.updateCounter(questionRef, 'comments', diff);
        utils.updateCounter(questionRef, 'points', diff*2);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{commentId}`)
    .onDelete(async (snapshot) => {
      console.log('commentDeleteTriggerDev');
      const questionId: string | undefined | null = snapshot.data().questionId;
      const replies : [] = snapshot.data().replies;
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
        const decrementNumber = 1+replies.length;
        utils.updateCounter(questionRef, 'comments', -decrementNumber);
        utils.updateCounter(questionRef, 'points', -(decrementNumber*2));
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
        const commentUid: string = commentDoc.data()!.uid;
        utils.addNotification('', commentId, kPollCommentLike,
            admin.firestore.FieldValue.serverTimestamp(), false, senderId, commentUid, dbSuffix);
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
      const isRead : boolean = snapshot.data().isRead;
      const type: string = snapshot.data().type;
      const url: string = snapshot.data().url;
      const senderId: string = snapshot.data().senderId;
      const recipientId: string = snapshot.data().recipientId;
      const id: string = snapshot.data().id;
      if (isRead) {
        console.debug(`notificationAddDev ignore, notification is read`);
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
        if (senderUsername == undefined || senderId == recipientId) {
          console.debug(`notificationAddDev ignore, sender and recipient are the same`);
          return;
        }

        console.info(`notificationAddDev ${type}`);
        title = senderUsername;
        if (kFriendRequest == type && (settings.friendRequestN || settings == undefined)) {
          body = 'send you a friend request';
        } else if (kFriendAccepted == type) {
          body = 'accepted your friend request';
        } else if (kCircleInvite == type && (settings.circleInviteN || settings == undefined)) {
          body = 'invited you to a circle';
        } else if (kCircleRequest == type && (settings.circleRequestN || settings == undefined) ) {
          body = 'send a request to join a circle';
        } else if (kPollComment == type && (settings.pollCommentN || settings == undefined)) {
          body = 'added a new comment on one of your polls';
        } else if (kPollCommentLike == type && (settings.pollCommentLikesN || settings == undefined)) {
          body = 'liked one of your comments on a poll';
        } else if (kPollLike == type && (settings.pollLikesN|| settings == undefined)) {
          body = 'liked one of your polls';
        } else if (kNewVote == type && (settings.pollVoteN || settings == undefined)) {
          body = 'just voted on one of your polls';
        } else if (kPollCommentReply == type && (settings.pollCommentReplyN || settings == undefined)) {
          body = 'just replied a comment you made on a poll';
        } else if (kProfileLiked == type && (settings.profileLikesN || settings == undefined)) {
          body = 'liked your profile in people nearby ????';
        } else {
          return;
        }
        await utils.sendPushNotifications([recipientId], {'type': type, 'notificationId': id, 'url': url}, body, title, false, dbSuffix);
      } catch (e) {
        console.error('Transaction failure:', e);
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


