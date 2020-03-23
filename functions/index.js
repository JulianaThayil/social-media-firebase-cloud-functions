const functions = require('firebase-functions');

const { db } = require('./util/admin');
const { getAllRecipes,postRecipe ,getRecipe,deleteRecipe,likeRecipe,unlikeRecipe,commentOnRecipe} = require('./handlers/recipes');
const { signup,login, uploadImage,addUserDetails,getAuthenticatedUser,getUserDetails,markNotificationsRead } = require('./handlers/users');


const express = require('express');
const app = express();

const FBAuth =require('./util/fbAuth');


//route to get all the recipe
app.get('/recipes', getAllRecipes );
//route to post recipes
app.post('/recipe',FBAuth, postRecipe );
app.get('/recipe/:recipeId', getRecipe);
app.delete('/recipe/:recipeId', FBAuth, deleteRecipe);
app.get('/recipe/:recipeId/like', FBAuth, likeRecipe);
app.get('/recipe/:recipeId/unlike', FBAuth, unlikeRecipe);
app.post('/recipe/:recipeId/comment', FBAuth, commentOnRecipe);


//Signup user route
app.post('/signup', signup);
//sign in route
app.post('/login', login);

app.post('/user/image',FBAuth ,uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);


//https://baseUrl.com/api/
exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/recipes/${snapshot.data().recipeId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            recipeId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });

  exports.deleteNotificationOnUnLike = functions
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      });
  });

  exports.createNotificationOnComment = functions
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/recipes/${snapshot.data().recipeId}`)
      .get()
      .then((doc) => {
        if ( doc.exists && doc.data().userHandle !== snapshot.data().userHandle) 
        {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            recipeId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

  exports.onUserImageChange = functions
  .firestore.document('/users/{userId}')
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('image has changed');
      const batch = db.batch();
      return db
        .collection('recipes')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const recipe = db.doc(`/recipes/${doc.id}`);
            batch.update(recipe, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onRecipeDelete = functions
  .region('europe-west1')
  .firestore.document('/recipes/{recipeId}')
  .onDelete((snapshot, context) => {
    const recipeId = context.params.recipeId;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('recipeId', '==', recipeId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('recipeId', '==', recipeId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('recipeId', '==', recipeId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });