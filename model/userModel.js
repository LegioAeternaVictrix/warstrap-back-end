const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: [true, "USERNAME REQUIRED"],
    minlength: 4
  },
  email: {
    type: String,
    unique: true,
    required: [true, "EMAIL REQUIRED"]
  },
  password: {
    type: String,
    required: [true, "PASSWORD REQUIRED"],
    minlength: 8,
    selected: false
  },
  passwordConfirm: {
    type: String,
    required: [true, "PASSWORDCONFIRM REQUIRED"],
    validate: {
      // THIS ONLY WORKS ON CREATE AND SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: "PASSWORDS ARE NOT THE SAME"
    },
    selected: false
  },
  passwordChangedAt: Date
});

userSchema.pre("save", async function(next) {
  // RUN THIS FUNCTION ONLY IF PASSWORD WAS MODIFIED
  if (!this.isModified("password")) return next();

  // HAS THE PASSWORD (12)
  this.password = await bcrypt.hash(this.password, 12);

  // DELETE PASSWORDCONFIRM FIELD
  this.passwordConfirm = undefined;
});

userSchema.pre("save", function(next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
