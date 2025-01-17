// const AWS = require("aws-sdk");
// const crypto = require("crypto");
// const jwt = require("jsonwebtoken");
// const docClient = new AWS.DynamoDB.DocumentClient();
// require("dotenv").config();

// exports.handler = async (event) => {
// 	const { mobileNumber, otp } = JSON.parse(event.body);

// 	// Check for missing fields
// 	if (!mobileNumber || !otp) {
// 		return {
// 			statusCode: 200,
// 			body: JSON.stringify({
// 				message: "Missing required fields",
// 				statusCode: 401,
// 			}),
// 		};
// 	}

// 	// Ensure mobileNumber is a valid format (basic validation)
// 	const mobileRegex = /^[0-9]{10}$/;
// 	if (!mobileRegex.test(mobileNumber)) {
// 		return {
// 			statusCode: 200,
// 			body: JSON.stringify({
// 				message: "Invalid mobile number format",
// 				statusCode: 401,
// 			}),
// 		};
// 	}

// 	// Hash the provided password

// 	// Define DynamoDB query parameters
// 	const params = {
// 		TableName: process.env.USERS_TABLE,
// 		IndexName: "MobileNumber-index", // Specify the index name here
// 		KeyConditionExpression: "MobileNumber = :mobileNumber",
// 		ExpressionAttributeValues: {
// 			":mobileNumber": mobileNumber,
// 		},
// 	};

// 	try {
// 		// Query DynamoDB
// 		const data = await docClient.query(params).promise();
// 		const user = data.Items[0];

// 		// Check if user exists and passwords match
// 		if (user && user.otp == otp) {
// 			// Generate a secret key for JWT signing (not stored)
// 			const secretKey = crypto.randomBytes(64).toString("hex");

// 			// Generate a JWT token using the generated secret key
// 			const token = jwt.sign(
// 				{ userId: user.UserId, name: user?.Name || undefined },
// 				secretKey,
// 				{ expiresIn: "1h" }
// 			);

// 			// Return the token in the response
// 			return {
// 				statusCode: 200,
// 				body: JSON.stringify({
// 					token: token,
// 					userId: user.UserId,
// 					name: user.Name || undefined,
// 					contact: user.MobileNumber,
// 					email: user.email || "",
// 					statusCode: 200,
// 				}),
// 			};
// 		} else {
// 			return {
// 				statusCode: 401,
// 				body: JSON.stringify({
// 					message: "Invalid mobile number or otp",
// 					statusCode: 401,
// 				}),
// 			};
// 		}
// 	} catch (error) {
// 		return {
// 			statusCode: 500,
// 			body: JSON.stringify({
// 				message: "Internal Server Error",
// 				error: error.message,
// 			}),
// 		};
// 	}
// };

const AWS = require("aws-sdk");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const docClient = new AWS.DynamoDB.DocumentClient();
require("dotenv").config();

exports.handler = async (event) => {
	const { mobileNumber, otp } = JSON.parse(event.body);

	// Check for missing fields
	if (!mobileNumber || !otp) {
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Missing required fields",
				statusCode: 401,
			}),
		};
	}

	// Ensure mobileNumber is a valid format (basic validation)
	const mobileRegex = /^[0-9]{10}$/;
	if (!mobileRegex.test(mobileNumber)) {
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Invalid mobile number format",
				statusCode: 401,
			}),
		};
	}

	// Define DynamoDB query parameters
	const params = {
		TableName: process.env.USERS_TABLE,
		IndexName: "MobileNumber-index", // Specify the index name here
		KeyConditionExpression: "MobileNumber = :mobileNumber",
		ExpressionAttributeValues: {
			":mobileNumber": mobileNumber,
		},
	};

	try {
		// Query DynamoDB
		const data = await docClient.query(params).promise();
		const user = data.Items[0];

		// Generate a secret key for JWT signing (not stored)
		const secretKey = crypto.randomBytes(64).toString("hex");

		// Generate a JWT token using the generated secret key
		const token = jwt.sign(
			{ userId: user?.UserId || null, name: user?.Name || null },
			secretKey,
			{ expiresIn: "1h" }
		);

		// Check if user exists and OTP matches
		if (user && user.otp == otp) {
			// User is verified
			return {
				statusCode: 200,
				body: JSON.stringify({
					token: token,
					userId: user.UserId,
					name: user.Name || null,
					contact: user.MobileNumber,
					email: user.email || "",
					verified: true, // Mark user as verified
					statusCode: 200,
				}),
			};
		} else {
			// User is not verified but still allowed
			return {
				statusCode: 200,
				body: JSON.stringify({
					token: token,
					userId: user?.UserId || null,
					name: user?.Name || null,
					contact: user?.MobileNumber || mobileNumber,
					email: user?.email || "",
					verified: false, // Mark user as unverified
					message: "OTP verification failed, user still allowed",
					statusCode: 200,
				}),
			};
		}
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Internal Server Error",
				error: error.message,
			}),
		};
	}
};
