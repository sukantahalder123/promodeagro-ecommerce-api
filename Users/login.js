require("dotenv").config();
const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const { sendOtp, generateOtp } = require("./sendOtp");

exports.handler = async (event) => {
	const { mobileNumber } = JSON.parse(event.body);

	// Check for missing fields
	if (!mobileNumber) {
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

	// Hash the provided password

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
		// Check if user exists and passwords match
		if (user) {
			const otp = generateOtp();
				 sendOtp(otp, mobileNumber);
			const params = {
				TableName: process.env.USERS_TABLE,
				Key: { UserId: user.UserId }, // Key to identify the item to update
				UpdateExpression: "set #otp = :newOtp", // Update the OTP field
				ExpressionAttributeNames: {
					"#otp": "otp", // Attribute to update
				},
				ExpressionAttributeValues: {
					":newOtp": otp, // New OTP value
				},
				ReturnValues: "UPDATED_NEW", // Return the updated attributes
			};

			await docClient.update(params).promise();
			return {
				statusCode: 200,
				body: JSON.stringify({
					message: "otp successfully sent",
				}),
			};
		} else {
			return {
				statusCode: 401,
				body: JSON.stringify({
					message: "Invalid mobile number or password",
					statusCode: 401,
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
