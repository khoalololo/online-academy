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
    if (req.session.user) {
      return next();  
    }
    res.redirect('account/signin');
  },
  
  //middleware to check if user is an admin
  isAdmin: (req, res, next) => {
    if (req.session.user && req.session.user.permission_level === PERMISSIONS.ADMIN) {
      return next();
    }
    res.status(403).send('Access Denied'); 
  },

  //middleware to check if user is an instructor or admin
  isInstructor(req, res, next) {
    const level = req.session.authUser.permission_level;
    if (req.session.isAuthenticated && (level === PERMISSIONS.INSTRUCTOR || level === PERMISSIONS.ADMIN)) {
      return next();
    }
    res.status(403).send('Access Denied');
  }
};