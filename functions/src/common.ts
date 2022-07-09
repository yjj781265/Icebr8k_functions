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
    // admin.auth().deleteUser(uid);
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
      }
      console.log(`deleteAccount comments deleted`);

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


    const chatMemberSnapShot = await admin.firestore().collectionGroup(`IbMembers${dbSuffix}`).where('uid', '==', uid).get();
    for (const doc of chatMemberSnapShot.docs) {
      await doc.ref.delete();
    }
    console.log(`deleteAccount chat member deleted`);
  } catch (e) {
    console.log(`deleteAccount failed ${e} `);
  }
});

