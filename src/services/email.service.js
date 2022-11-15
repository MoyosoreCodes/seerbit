const nodemailer = require('nodemailer');
const ejs = require("ejs");
const bcrypt = require('bcryptjs');
const { url, client_url, smtpOptions, port } = require('../config');
const path = require('path');
const {sendEmail} = require('../utils/send-email')
const logger = require('../config/logger')

const renderEmailTemplate =  async (templateName, data = {}) => {
	const template = path.join(__dirname, `../views/emailTemplates/${templateName}.ejs`)
	return await ejs.renderFile(template, data);
}

module.exports = {
	sendWelcomeEmail: async ({email, username}) => {
		const WelcomeEmailTemplate = await renderEmailTemplate("WelcomeEmail", {username})
		const mailInfo = {
			to: email, 
			subject: `Welcome ${username}`, 
			html: WelcomeEmailTemplate,
			from: "hey@symble.live"
		}
		await sendEmail(mailInfo)
	}, 
	/**
	 * 
	 * @param {*} data 
	 */
	sendAccountVerificationEmail: async ({ email, username, confirmation_code }) => {
		//const hashedConfirmationCode = await bcrypt.hash(confirmation_code, 10);
		const verificationUrl = `${url}/api/auth/verify-email/?token=${confirmation_code}`;
        const verificationSlug = `/api/auth/verify-email/?token=${confirmation_code}`
		const AccountVerificationEmailTemplate = await renderEmailTemplate("AccountVerificationEmail", {username, verificationUrl});

		const mailInfo = {
			to: email, 
			subject: `Registration`, 
			html: AccountVerificationEmailTemplate,
			from: "hey@symble.live"
		}
		await sendEmail(mailInfo)

        return verificationSlug
	},

	sendResetPasswordEmail: async ({email, confirmation_code}) => { 
		// const hashedConfirmationCode = await bcrypt.hash(confirmation_code, 10);

		const resetPasswordUrl = `${client_url}/reset-password?token=${confirmation_code}`;
		const resetPasswordSlug = `${url}/api/auth/reset-password?token=${confirmation_code}`
		const ResetPasswordEmailTemplate = await renderEmailTemplate("ResetPasswordEmail", {resetPasswordUrl});

		const mailInfo = {
			to: email, 
			subject: `Reset password`,
			html: ResetPasswordEmailTemplate,
		}

		await sendEmail(mailInfo)

        return resetPasswordSlug
	},
    

	sendTransactionInfoEmail: async (data) => {

	}, 
}