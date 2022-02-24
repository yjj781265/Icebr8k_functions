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

      // + user asked size
      try {
        handleTagQuestionCount(true, tagIds);
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

      // - user asked size
      try {
        handleTagQuestionCount(false, tagIds);
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
      // + comment size
      try {
        Counter.incrementBy(questionRef, 'comments', 1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });

export const commentDeleteTriggerDev = functions.firestore
    .document(`IbQuestions${dbSuffix}/{docId}/Comments${dbSuffix}/{uid}`)
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

      // - poll size
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

      // + like count
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

      // - like count
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

      // + reply count
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

      // - reply count
      try {
        Counter.incrementBy(commentRef, 'replies', -1);
      } catch (e) {
        console.log('Transaction failure:', e);
      }
    });


/**
 * Adds two numbers together.
 * @param {boolean} isIncrement add or decrease count by 1.
 * @param {string[]} tagIds array of tagIds.
 */
function handleTagQuestionCount(isIncrement: boolean, tagIds: string[] ) {
  for (let i=0; i<tagIds.length; i++) {
    const id = tagIds[i];
    console.log(id.toString());
    const tagRef = admin
        .firestore()
        .collection(`IbTags${dbSuffix}`)
        .doc(id.toString());

    if (isIncrement) {
      Counter.incrementBy(tagRef, 'questionCount', 1 );
    } else {
      Counter.incrementBy(tagRef, 'questionCount', -1 );
    }
  }
}
