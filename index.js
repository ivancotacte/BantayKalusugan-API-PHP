const express = require('express');
const { check, validationResult } = require("express-validator");
const bodyParser = require("body-parser");
const dotenv = require('dotenv');
const session = require("express-session");
const mongoose = require('mongoose');
const helmet = require("helmet");
const MongoDBSession = require("connect-mongodb-session")(session);
dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    dbName: "db_ICCTPortal",
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.log("Failed to connect to MongoDB", err);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(helmet());
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    store: new MongoDBSession({
        uri: process.env.MONGO_URI,
        collection: "sessions",
        databaseName: "db_ICCTPortal",
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

const UserModel = require("./models/userModel.js");
const { sendEmail } = require("./models/emailSender.js");

app.get("/register", (req, res) => {
    const formData = req.session.formData || {};
    const errors = req.session.errors || {};
    res.render("register", { errors, formData });
    req.session.errors = null;
});

app.post("/register", [
    check("firstName").notEmpty().withMessage("Please provide your first name."),
    check("lastName").notEmpty().withMessage("Please provide your last name."),
    check("ageNumber").notEmpty().withMessage("Please provide your age."),
    check("gender").notEmpty().withMessage("Please specify your gender."),
    check("height").notEmpty().withMessage("Please provide your height."),
    check("contactNum").notEmpty().withMessage("Please provide your contact number."),
    check("email").isEmail().withMessage("Please provide a valid email address.").notEmpty().withMessage("Please provide your email address."),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.errors = errors.mapped();
        req.session.formData = req.body;
        return res.redirect('/register');
    }

    const { firstName, middleName, lastName, suffixName, ageNumber, gender, height, contactNum, email } = req.body;
    
    let userEmail = await UserModel.findOne({ email });
    if (userEmail) {
        req.session.errors = {
            email: {
                value: email,
                msg: "This email address is already registered.",
                param: "email",
                location: "body",
            },
        };
        req.session.formData = req.body;
        return res.redirect("/register");
    }

    const user = new UserModel({
        firstName,
        middleName,
        lastName,
        suffixName,
        ageNumber,
        gender,
        height,
        contactNum,
        email,
    });

    let savedUser = await user.save();
    if (savedUser) {
        req.session.userEmail = savedUser.email;
        req.session.firstName = savedUser.firstName;
        return res.redirect("/checkinghealth");
    } else {
        req.session.errors = {
            form: {
                msg: "There was an error saving your information. Please try again.",
            },
        };
        req.session.formData = req.body;
        res.redirect("/register");
    }
});

app.get("/checkinghealth", (req, res) => {
    const errors = req.session.errors || {};
    const userEmail = req.session.userEmail || "N/A";

    if (userEmail === "N/A") {
        req.session.errors = {
            form: {
                msg: "There was an error retrieving your information. Please try again.",
            },
        };
        return res.redirect("/register");
    }

    res.render("checkinghealth", { errors, userEmail });
    req.session.errors = null;
});

app.post("/checkinghealth", async (req, res) => {
    const userEmail = req.session.userEmail || "N/A";
    const { heartRate, SpO2 } = req.body;

    let user = await UserModel.findOne({ email: userEmail });
    if (!user) {
        req.session.errors = {
            form: {
                msg: "There was an error retrieving your information. Please try again.",
            },
        };
        return res.redirect("/register");
    }

    user.heartRate = heartRate;
    user.SpO2 = SpO2;

    let savedUser = await user.save();

    if (savedUser) {
        sendEmail(userEmail, user.firstName, user.lastName, heartRate, SpO2);
        return res.redirect("/register");
    }
});




app.post('/test', (req, res) => {
    const { heartRate, SpO2 } = req.body; 
    console.log(`Received data from ESP32: Heart Rate = ${heartRate}, SpO2 = ${SpO2}`);

    res.send("success");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});