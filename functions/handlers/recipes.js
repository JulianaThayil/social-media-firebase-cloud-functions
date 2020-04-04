const { db } = require('../util/admin');
var cors = require('cors');  

exports.getAllRecipes = (req, res) => {
 
  db.collection('recipes')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let recipes = [];
      data.forEach((doc) => {
        recipes.push({
          recipeId: doc.id,
          title:doc.data().title,
          cookingTime:doc.data().cookingTime,
          serves:doc.data().serves,
          body:doc.data().body,
          ingredients:doc.data().ingredients,
          intructions:doc.data().intructions,
          pictureUrl:doc.data().pictureUrl,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json(recipes);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postRecipe = (req,res) => {
  cors(req, res, () => {});
  res.set('Access-Control-Allow-Headers', 'Bearer, Content-Type');
  
  
  const newRecipe = {
      title:req.body.title,
      cookingTime:req.body.cookingTime,
      serves:req.body.serves,
      body:req.body.body,
      ingredients:req.body.ingredients,
      intructions:req.body.intructions,
      pictureUrl:req.body.pictureUrl,
      userHandle:req.user.handle,
      userImage:req.user.imageUrl,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0
  };
  db
      .collection('recipes')
      .add(newRecipe)
      .then(doc =>{
        const resRecipe = newRecipe;
        resRecipe.recipeId = doc.id;
        res.json(resRecipe);    
      })
  .catch(err =>{
      res.status(500).json({ error: 'something went wrong'});
      console.error(err);
  });

};


// Fetch one recipe
exports.getRecipe = (req, res) => {
  let RecipeData = {};
  db.doc(`/recipes/${req.params.recipeId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'recipe not found' });
      }
      recipeData = doc.data();
      recipeData.recipeId = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('recipeId', '==', req.params.recipeId)
        .get();
    })
    .then((data) => {
      recipeData.comments = [];
      data.forEach((doc) => {
        recipeData.comments.push(doc.data());
      });
      return res.json(recipeData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Comment on a recipe
exports.commentOnRecipe = (req, res) => {
  cors(req, res, () => {});
  res.set('Access-Control-Allow-Headers', 'Bearer, Content-Type');

  if (req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    recipeId: req.params.recipeId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };
  console.log(newComment);

  db.doc(`/recipes/${req.params.recipeId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'recipe not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
};

// Like a recipe
exports.likeRecipe = (req, res) => {
  cors(req, res, () => {});
  res.set('Access-Control-Allow-Headers', 'Bearer, Content-Type');

  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.recipeId)
    .limit(1);

  const recipeDocument = db .doc(`/recipes/${req.params.recipeId}`);

  let recipeData ;

  recipeDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        recipeData = doc.data();
        recipeData.recipeId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'recipe not found' });
      }
    })
    .then((data) => {
      if(data.empty) {
        return db
          .collection('likes')
          .add({
            recipeId: req.params.recipeId,
            userHandle: req.user.handle
          })
          .then(() => {
            recipeData.likeCount++;
            return recipeDocument.update({ likeCount: recipeData.likeCount });
          })
          .then(() => {
            return res.json(recipeData);
          });
      } else {
        return res.status(400).json({ error: 'recipe already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//unlike a recipe
exports.unlikeRecipe = (req, res) => {
  cors(req, res, () => {});
  res.set('Access-Control-Allow-Headers', 'Bearer, Content-Type');

  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.recipeId)
    .limit(1);

  const recipeDocument = db.doc(`/recipes/${req.params.recipeId}`);

  let recipeData;

  recipeDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        recipeData = doc.data();
        recipeData.recipeId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'recipe not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'recipe not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            recipeData.likeCount--;
            return recipeDocument.update({ likeCount: recipeData.likeCount });
          })
          .then(() => {
            res.json(recipeData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Delete a recipe
exports.deleteRecipe = (req, res) => {
  cors(req, res, () => {});
  res.set('Access-Control-Allow-Headers', 'Bearer, Content-Type');

  const document = db.doc(`/recipes/${req.params.recipeId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'recipe not found' });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'recipe deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
}; 