require("dotenv").config();
const axios = require("axios");
const { randomInt } = require("node:crypto");

async function sendOtp(otp, number) {
	const url =
		"https://restapi.smscountry.com/v0.1/Accounts/" +
		process.env.SMS_AUTH +
		"/SMSes/";
	const header = Buffer.from(
		`${process.env.SMS_AUTH}:${SMS_AUTH_TOKEN}`,
		"utf-8"
	).toString("base64");
	await axios
		.post(
			url,
			{
				Text: `${otp} is your otp to login into Promode Agro Application. Team Promo Agro Farms`,
				Number: number,
				SenderId: "PROMAG",
				Tool: "API",
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: "Basic " + header,
				},
			}
		)
		.then((data) => console.log(data))
		.catch((err) => console.log(err));
}

function generateOtp() {
	return randomInt(100000, 999999);
}

module.exports = { sendOtp, generateOtp };
