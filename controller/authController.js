const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const signToken = (id, username, email) => {
  return jwt.sign({ id, username, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createToken = (user, statusCode, req, res) => {
  const token = signToken(user._id, user.username, user.email);

  res.cookie("jwtCookie", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https"
  });

  res.status(statusCode).json({
    status: "success"
  });
};

exports.register = catchAsync(async (req, res) => {
  const user = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  //REMOVE PASSWORD FROM OUTPUT
  user.password = undefined;
  user.passwordConfirm = undefined;

  createToken(user, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // CHECK IF USERNAME AND PASSWORD EXIST IN BODY
  if (!username || !password) {
    return next(new AppError("NO USERNAME/PASSWORD", 400));
  }

  // CHECK IF USER STILL EXISTS ...
  const user = await User.findOne({ username }).select("+password");

  // ... AND PASSWORD IS CORRECT
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorect email or password", 401));
  }

  createToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  // res.cookie("jwtCookie", "loggedout", {
  //   expires: new Date(Date.now() - 10 * 1000),
  //   httpOnly: true
  // });
  res.clearCookie("jwtCookie", { path: "/" });
  res.status(200).json({ status: "success" });
};

exports.changeData = catchAsync(async (req, res, next) => {
  const update = {
    username: req.body.username,
    email: req.body.email
  };

  const { id } = req.body;

  await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: "success"
  });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.body.id).select("+password");

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.repeatPassword;

  await user.save();

  createToken(user, 200, req, res);
});

exports.isLoggedIn = catchAsync(async (req, res) => {
  if (req.cookies.jwtCookie) {
    // VERIFY TOKEN
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwtCookie,
      process.env.JWT_SECRET
    );

    // CHECK IF USER STILL EXISTS
    const user = await User.findById(decoded.id);

    if (!user) {
      return this.logout(req, res);
    }

    // CHECK IF USER CHAGED PASSWORD AFTER THE TOKEN WAS ISSUES
    if (user.changedPasswordAfter(decoded.iat)) {
      return this.logout(req, res);
    }

    // IF THERE IS A LOGGED IN USER
    res.status(200).json({
      status: "success",
      user
    });
  } else {
    res.status(200).json({
      status: "noToken"
    });
  }
});
