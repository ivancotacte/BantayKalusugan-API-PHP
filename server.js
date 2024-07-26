import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import session from 'express-session';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

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
    res.render('login', { email });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email) {
        req.session.email = email;
        return res.redirect('/login');
    }

    if (password) {
        console.log(`Email: ${req.session.email}, Password: ${password}`);
        req.session.destroy();
        return res.redirect('/login');
    }

    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});