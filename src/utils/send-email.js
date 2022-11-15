const nodemailer = require('nodemailer');
const { smtpOptions } = require('../config')

async function sendEmail({ to, subject, html, from }) {
    const transporter = nodemailer.createTransport(smtpOptions);
    transporter.verify((error, success) => {
        if (error) throw Error('cannot send email')
        else { console.log('nodemailer: ready') }
    })
    await transporter.sendMail({from,to, subject, html });
}

module.exports = {sendEmail}