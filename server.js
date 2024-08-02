import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import mysql from 'mysql2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static('public'));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'name', 'emails']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/', (req, res) => {
    return res.redirect('/login');
});

app.get('/test', (req, res) => {
    res.render('test');
});

app.post('/test', (req, res) => {
    const { heartRate, spO2, apiKey } = req.body;

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ message: 'Unauthorized access. Invalid API key.' });
    }

    if(!heartRate || !spO2) {
        return res.status(400).json({ message: 'Heart Rate and SpO2 are required.' });
    }

    console.log(`Heart Rate: ${heartRate}, SpO2: ${spO2}`);

    res.status(200).json({ message: 'Data received successfully.' });
});

app.get('/login', (req, res) => {
    const { email } = req.session;
    const error = req.session.error;
    req.session.error = null;
    res.render('login', { email, error });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (email) {
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database query error' });
            }

            if (results.length === 0) {
                req.session.error = 'No account found with the provided email address.';
                return res.redirect('/login');
            }

            req.session.email = email;
            return res.redirect('/login');
        });
    } else if (password) {
        console.log(`Email: ${req.session.email}, Password: ${password}`);
        req.session.destroy();
        return res.redirect('/login');
    } else {
        res.redirect('/login');
    }
});

app.get('/register', (req, res) => {
    const error = req.session.error;
    req.session.error = null;
    res.render('register', { error });
});

app.post('/register', (req, res) => {
    const { firstName, middleName, lastName, birthday, email, password } = req.body;

    if (!firstName || !lastName || !birthday || !email || !password) {
        req.session.error = 'All fields are required.';
        return res.redirect('/register');
    }

    const newUser = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        birthday: birthday,
        email: email,
        password: password 
    };

    db.query('INSERT INTO users SET ?', newUser, (err, results) => {
        if (err) {
            req.session.error = 'Already registered with the provided email address.';
            return res.redirect('/register');
        }

        res.status(201).json({ message: 'User registered successfully' });
    });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    const googleUser = req.user;

    db.query('SELECT * FROM users WHERE google_id = ?', [googleUser.id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database query error' });
        }

        if (results.length === 0) {
            req.session.error = 'No account found with the associated Google account. Please sign up first.';
            return res.redirect('/login');
        }

        console.log('Google Profile Information:');
        console.log(`ID: ${googleUser.id}`);
        console.log(`Display Name: ${googleUser.displayName}`);
        console.log(`Name: ${googleUser.name.givenName} ${googleUser.name.familyName || ''}`);
        console.log(`Emails: ${googleUser.emails.map(email => email.value).join(', ')}`);

        res.redirect('/login');
    });
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
    const facebookUser = req.user;

    db.query('SELECT * FROM users WHERE facebook_id = ?', [facebookUser.id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database query error' });
        }

        if (results.length === 0) {
            req.session.error = 'No account found with the associated Facebook account. Please sign up first.';
            return res.redirect('/login');
        }

        console.log('Facebook Profile Information:');
        console.log(`ID: ${facebookUser.id}`);
        console.log(`Display Name: ${facebookUser.displayName}`);
        console.log(`Name: ${facebookUser.name.givenName} ${facebookUser.name.familyName || ''}`);
        console.log(`Emails: ${facebookUser.emails.map(email => email.value).join(', ')}`);

        res.redirect('/login');
    });
});

app.get('/edit-email', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to clear session.' });
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});