const express = require("express");

const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const globalErrorHandler = require("./controller/errorController");
const userRouter = require("./routes/userRoute");
const AppError = require("./utils/appError");

app.use(express.json());

// HEROKU
// app.enable("trust proxy");

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET, POST, PATCH",
    credentials: true
  })
);

dotenv.config({ path: "./config.env" });

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log("DB connection successful!"));

app.listen(process.env.PORT, function() {
  console.log(`Server is running on port ${process.env.PORT}`);
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use("/", userRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
