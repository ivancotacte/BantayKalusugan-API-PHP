const nodemailer = require("nodemailer");
const axios = require('axios');
const moment = require('moment-timezone');

const transporter = nodemailer.createTransport({
    service: "gmail",
    port: "465",
    secure: true,
    logger: false,
    debug: false,
    secureConnection: true,
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

async function sendEmail(emailAddress, firstName, lastName, heartRate, SpO2) {
    const current_time = moment().tz("Asia/Manila").format('MMMM Do YYYY, h:mm:ss a');
    const question = encodeURIComponent(`Act as a Doctor and give me advice to my health here my Heart Rate ${heartRate}, Spo2 ${SpO2}%`);
    const url = `https://hercai.onrender.com/v3/hercai?question=${question}`;

    try {
        const response = await axios.get(url);
        const ai_reply = response.data.reply;

        const mailOptions = {
            from: '"GROUP 10 - LFSA322N002 👻" <cotactearmenion@gmail.com>',
            to: emailAddress,
            subject: `Health Monitoring System - Health Update`,
            html: `
                <html>
                    <head>
                        <title>Health Update</title>
                    </head>
                    <body>
                        <p>Dear ${firstName} ${lastName},</p>
                        <p>We would like to inform you about the latest health update as of ${current_time}:</p>
                        <ul>
                            <li><strong>Height:</strong> 0 cm</li>
                            <li><strong>Weight:</strong> 0 kg</li>
                            <li><strong>Heart Rate:</strong> ${heartRate} bpm</li>
                            <li><strong>Oxygen Saturation:</strong> ${SpO2} %</li>
                        </ul>
                        <p>AI Response: ${ai_reply}</p>
                        <p>Thank you for using our Health Monitoring System.</p>
                    </body>
                </html>
            `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error: ", error);
            } else {
                console.log("Success: ", info.response);
            }
        });
    } catch (error) {
        console.error("Error fetching AI response: ", error);
    }
}

module.exports = { sendEmail };