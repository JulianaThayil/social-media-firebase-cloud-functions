const {admin,db} = require('./admin');

module.exports = (req, res,next) =>{


  
    //token needs to start with bearer space
    let idToken;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      //extracting token
      idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
      console.error('No token found');
      return res.status(403).json({ error: 'Unauthorized' });
    }
  
    //verify where tis was request by our application only
    admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        //decoded token holds the user info
        req.user = decodedToken;
        console.log(decodedToken);
        return db.collection('users')
          .where('userId', '==', req.user.uid)
          .limit(1)
          .get();
      })
      .then(data => {
        req.user.handle = data.docs[0].data().handle;
        req.user.imageUrl = data.docs[0].data().imageUrl;
        return next();
      })
  
      .catch(err => {
        console.error('Error while verifying token ', err);
        return res.status(403).json(err);
      });
    
  
  };
  
