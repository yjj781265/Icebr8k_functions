/* eslint-disable max-len */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const userStatusPending = 'pending';
const userStatusApproved = 'approved';
const userStatusRejected = 'rejected';

export const sendStatusEmail = functions.https.onCall((data) => {
  const fName: string = data.fName;
  const status: string = data.status;
  const email: string = data.email;
  const note: string = data.note;
  let html = '';
  let subject = '';

  if (status === userStatusApproved) {
    subject = 'Your Icebr8k profile is approved';
    html = `<p>Hello ${fName},</p>
      <div>
      <p>Congratulations, your Icebr8k profile is approved! Now you can login to your Icebr8k app to find people with common interests around you. Have fun and enjoy the journey!</p>
      <div>&nbsp;</div>
      <div><img src="https://firebasestorage.googleapis.com/v0/b/icebr8k-flutter.appspot.com/o/admin_files%2Flogo.png?alt=media&amp;token=f5102025-e92c-472c-8c04-e6370cad707c" alt="icebr8k logo" width="31" height="31" /></div>
      <div>Junjie(Founder of Icebr8k)</div>
      </div>`;
    sendEmail(email, subject, html);
  } else if (status === userStatusRejected) {
    subject = 'Your Icebr8k profile is rejected';
    html = `<p>Your Icebr8k profile is rejected due to the following reason(s):</p>
      <p>${note}</p>
      <p>&nbsp;</p>
      <p>Don't worry, you can resubmit your profile by login to the Icebr8k app, we are looking forward to approve your profile once the issues mentioned above are addressed.&nbsp; If you have any questions, please reply to this email, or send an email directly to <span style="text-decoration: underline;"><a href="mailto:hello@icebr8k.com">hello@icebr8k.com</a></span></p>
      <p>&nbsp;</p>
      <p>Best Regards,</p>
      <p>Junjie(Founder of Icebr8k)</p>`;
    sendEmail(email, subject, html);
  } else if (status === userStatusPending) {
    sendEmail(
        email,
        'Your Icebr8k profile is under review',
        `<p>Hello ${fName},</p>
          <div>
          <p>Thank you for signing up with Icebr8k. We will review your profile and notify you of the status as soon as possible. Thank you for your patience.</p>
          <div>&nbsp;</div>
          <div><img src="https://firebasestorage.googleapis.com/v0/b/icebr8k-flutter.appspot.com/o/admin_files%2Flogo.png?alt=media&amp;token=f5102025-e92c-472c-8c04-e6370cad707c" alt="icebr8k logo" width="31" height="31" /></div>
          <div>Junjie(Founder of Icebr8k)</div>
          </div>`,
    );
  }
});

/**
 * Send email to one person.
 * @param {string} email An array containing the recipient UIDs.
 * @param {string} subject The subject of the email.
 * @param {string} html The html content of the email.
 */
function sendEmail(email: string, subject: string, html: string) {
  admin
      .firestore()
      .collection('Mails')
      .add({to: email, message: {subject: subject, html: html}});
}


export const deleteAccount = functions.https.onCall(async (data) => {
  const dbSuffix: string = data.dbSuffix;
  const uid: string = data.uid;

  try {
    admin.auth().deleteUser(uid);
    const userRef = admin.firestore().collection(`IbUsers${dbSuffix}`).doc(uid);
    await userRef.delete();
    console.log(`deleteAccount user deleted`);

    const notificationSnapShot = await userRef.collection(`IbNotifications${dbSuffix}`).get();
    for (const doc of notificationSnapShot.docs) {
      await doc.ref.delete();
    }
    console.log(`deleteAccount user notifications deleted`);

    const profileLikesSnapShot = await userRef.collection(`IbProfileLikes${dbSuffix}`).get();
    for (const doc of profileLikesSnapShot.docs) {
      await doc.ref.delete();
    }
    console.log(`deleteAccount user profileLikes deleted`);

    const questionsSnapShot = await admin.firestore().collection(`IbQuestions${dbSuffix}`).where('creatorId', '==', uid).get();
    for (const doc of questionsSnapShot.docs) {
      await doc.ref.delete();
      const commentsSnapShot = await doc.ref.collection(`Comments${dbSuffix}`).get();
      for (const doc of commentsSnapShot.docs) {
        await doc.ref.delete();
        const likesSnapShot = await doc.ref.collection(`Comments-Likes${dbSuffix}`).get();
        for (const like of likesSnapShot.docs) {
          await like.ref.delete();
        }
      }
      console.log(`deleteAccount question comments deleted`);

      const answersSnapShot = await doc.ref.collection(`Answers${dbSuffix}`).get();
      for (const doc of answersSnapShot.docs) {
        await doc.ref.delete();
      }
      console.log(`deleteAccount questions answers deleted`);

      const likesSnapShot = await doc.ref.collection(`Likes${dbSuffix}`).get();
      for (const doc of likesSnapShot.docs) {
        await doc.ref.delete();
      }
      console.log(`deleteAccount questions likes deleted`);
    }
    console.log(`deleteAccount questions deleted`);

    const commentsSnapShot = await admin.firestore().collectionGroup(`Comments${dbSuffix}`).where('uid', '==', uid).get();
    for (const doc of commentsSnapShot.docs) {
      await doc.ref.delete();
      const likesSnapShot = await doc.ref.collection(`Comments-Likes${dbSuffix}`).get();
      for (const like of likesSnapShot.docs) {
        await like.ref.delete();
      }
    }
    console.log(`deleteAccount user comments deleted`);

    const answersSnapShot = await admin.firestore().collectionGroup(`Answers${dbSuffix}`).where('uid', '==', uid).get();
    for (const doc of answersSnapShot.docs) {
      await doc.ref.delete();
    }
    console.log(`deleteAccount user answers deleted`);

    const chatMemberSnapShot = await admin.firestore().collectionGroup(`IbMembers${dbSuffix}`).where('uid', '==', uid).get();
    for (const doc of chatMemberSnapShot.docs) {
      await doc.ref.delete();
    }
    console.log(`deleteAccount chat member deleted`);
  } catch (e) {
    console.log(`deleteAccount failed ${e} `);
  }
});

export const tagPollStatsScheduledFunction = functions.pubsub.schedule('every 720 hours').onRun(async (context) => {
  try {
    console.log('tagPollStatsScheduledFunction started');
    const kUserCollectionDevSnap = await admin.firestore().collection('IbUsers-dev').get();
    for (const doc of kUserCollectionDevSnap.docs) {
      const uid = doc.id;
      const askedCountSnap = await admin.firestore().collection('IbQuestions-dev').where('creatorId', '==', uid).get();
      const askedCount = askedCountSnap.docs.length;
      const answeredCountSnap = await admin.firestore().collectionGroup('Answers-dev').where('uid', '==', uid).get();
      const answeredCount = answeredCountSnap.docs.length;
      await admin.firestore().collection('IbUsers-dev').doc(uid).update({'askedCount': askedCount, 'answeredCount': answeredCount});
    }

    const kUserCollectionProdSnap = await admin.firestore().collection('IbUsers-prod').get();
    for (const doc of kUserCollectionProdSnap.docs) {
      const uid = doc.id;
      const askedCountSnap = await admin.firestore().collection('IbQuestions-prod').where('creatorId', '==', uid).get();
      const askedCount = askedCountSnap.docs.length;
      const answeredCountSnap = await admin.firestore().collectionGroup('Answers-prod').where('uid', '==', uid).get();
      const answeredCount = answeredCountSnap.docs.length;
      await admin.firestore().collection('IbUsers-prod').doc(uid).update({'askedCount': askedCount, 'answeredCount': answeredCount});
    }

    const kTagCollectionDevSnap = await admin.firestore().collection('IbTags-dev').get();
    for (const doc of kTagCollectionDevSnap.docs) {
      const tag = doc.id;
      const questionCountSnap = await admin.firestore().collection('IbQuestions-dev').where('isPublic', '==', true).where('tags', 'array-contains', tag).get();
      const questionCount = questionCountSnap.docs.length;
      await admin.firestore().collection('IbTags-dev').doc(tag).update({'questionCount': questionCount});
    }

    const kTagCollectionProdSnap = await admin.firestore().collection('IbTags-prod').get();
    for (const doc of kTagCollectionProdSnap.docs) {
      const tag = doc.id;
      const questionCountSnap = await admin.firestore().collection('IbQuestions-prod').where('isPublic', '==', true).where('tags', 'array-contains', tag).get();
      const questionCount = questionCountSnap.docs.length;
      await admin.firestore().collection('IbTags-prod').doc(tag).update({'questionCount': questionCount});
    }


    return null;
  } catch (e) {
    console.log('tagPollStatsScheduledFunction failed ', e);
    return null;
  }
});

