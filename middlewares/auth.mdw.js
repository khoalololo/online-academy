import userModel from "../models/user.model.js";

export const PERMISSIONS ={
    GUEST: 0,
    STUDENT: 1,
    INSTRUCTOR: 2,
    ADMIN: 3
};

export default {
  //middleware to check if user is authenticated
  isAuthenticated: (req, res, next) => {
    if (req.session.isAuthenticated && req.session.authUser) {
      return next();  
    }
    req.session.retUrl = req.originalUrl;
    res.redirect('/account/signin');
  },
  
  //middleware to check if user is an admin
  isAdmin: (req, res, next) => {
    if (req.session.isAuthenticated && req.session.authUser && req.session.authUser.permission_level === PERMISSIONS.ADMIN) {
      return next();
    }
    res.status(403).render('403', { 
      layout: false, error: { status: 403, message: 'Access Denied' } 
    });
  },

  //middleware to check if user is an instructor or admin
  isInstructor(req, res, next) {
    const user = req.session.authUser;
    if (
      req.session.isAuthenticated &&
      user &&
      (user.permission_level === PERMISSIONS.INSTRUCTOR ||
        user.permission_level === PERMISSIONS.ADMIN)
    ) {
      return next();
    }
    return res.status(403).render('403', { 
      layout: false, error: { status: 403, message: 'Access Denied' } 
    });
  }
};