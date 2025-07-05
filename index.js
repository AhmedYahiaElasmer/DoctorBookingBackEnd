const express = require("express");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const morgan = require("morgan");
const app = express();
const helmet = require("helmet");
const mongoos = require("mongoose");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const http = require("http");
const doctor = require("./Model/DoctorModel");
const admin = require("./Model/adminModel");
const cors = require("cors");
const https = require("https");
const fs = require("fs");

app.use(
  cors({
    origin: "http://localhost:3001", // set the allowed origin
    // methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'], // set the allowed HTTP methods
    // allowedHeaders: ['Content-Type'], // set the allowed headers
    credentials: true, // set the allowed credentials
  })
);
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "https://ahmedyahia00.github.io"); // set the allowed origin
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // set the allowed HTTP methods
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); // set the allowed headers
//   res.header("Access-Control-Allow-Credentials", "true"); // set the allowed credentials
//   next();
// });
// set our application port
app.set("port", 4009);

// set morgan to log info about our requests for development use.
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
// app.set("trust proxy", 1);
// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
mongoos.set("strictQuery", false);
mongoos
  .connect(
    "mongodb+srv://ahemdelasmer:hmt8u7Kke85NjHTz@cluster0.i0tv4ld.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      //useCreateIndex:true,
      //useFindAndModify:false
    }
  )
  .then(() => {
    console.log("connected");
  })
  .catch((err) => {
    console.log(err);
  });
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false,
  })
);

app.use(
  session({
    key: "user_sid",
    secret: process.env.booking_app_jwt_secret,
    resave: false,
    saveUninitialized: false,

    cookie: {
      sameSite: "lax",
      secure: false,

      maxAge: 8600000,
    },
  })
);

app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie("user_sid");
  }
  next();
});
// middleware function to check for logged-in users
app.get("/sessioncheck", (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    if (req.session.user.isadmin == true) {
      res.status(201).send("user is admin");
    } else {
      res.status(200).send("user is doctor");
    }
  } else {
    console.log(req.session.user);

    res.status(203).send("login....");
  }
});

app.post("/login", async (req, res) => {
  // res.set("Access-Control-Allow-Origin", "http://localhost:3001");
  try {
    console.log(req.body);
    const userr = await doctor
      .findOne({ email: req.body.email, isactive: true })
      .exec();
    const adminuser = await admin
      .findOne({ email: req.body.email, isactive: true })
      .exec();
    console.log(adminuser);

    if (userr) {
      let comparpass = await bcrypt.compare(req.body.password, userr.password);
      // let comparpass = req.body.password === userr.password ? true : false;
      // console.log({
      //   reqpass: req.body.password,
      //   dbpass: userr.password,
      //   com: comparpass,
      // });

      if (!comparpass) {
        return res.status(403).send("invaild username or password");
      }

      req.session.user = userr;
      // res.header("Content-Type", "application/json");

      res.status(200).send("success user");
    } else if (adminuser) {
      let comparpass2 = await bcrypt.compare(
        req.body.password,
        adminuser.password
      );
      // let comparpass2 = req.body.password === adminuser.password ? true : false;
      console.log({
        reqpass: req.body.password,
        dbpass: adminuser.password,
        com: comparpass2,
      });

      if (!comparpass2) {
        return res.status(403).send("invaild username or password");
      }

      req.session.user = adminuser;
      res.status(201).send("success admin");
    } else {
      return res.status(404).send("not found");
    }
  } catch (error) {
    console.log(error);
    return res.status(404).send("not found");
  }
});

app.get("/", (req, res) => {
  res.send("hello");
});

//routs mount
const doctorroute = require("./Routes/DoctoreRout");
app.use("/doctor", doctorroute);
const adminroute = require("./Routes/AdminRout");
app.use("/admin", adminroute);
const mobileroute = require("./Routes/MobileRout");
app.use("/api", mobileroute);

app.get("/logout", (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.clearCookie("user_sid");
    res.status(203).send("success logout");
  } else {
    res.status(403).send("forbidden");
  }
});
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!");
});
const httpsOptions = {
  key: fs.readFileSync("./security/cert.key"),
  cert: fs.readFileSync("./security/cert.pem"),
};
const server = http.createServer(app).listen(8000, "0.0.0.0", () => {
  console.log("server running at " + 8000);
});
