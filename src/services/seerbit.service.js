const { Client, Config, StandardCheckout } = require("seerbit-nodejs");
const { NODE_ENV, seerbit: { publicKey, publicTestKey, secretTestKey, secretKey, bearerToken, bearerTestToken, url }, url: api_url, client_url } = require('../config');

const seerbitPublicKey = NODE_ENV == 'development' ? publicTestKey : publicKey;
const seerbitSecretKey = NODE_ENV == 'development' ? secretTestKey : secretKey;
const seerbitBearerToken = NODE_ENV == 'development' ? bearerTestToken : bearerToken;

const config = new Config({ publicKey: seerbitPublicKey, secretKey: seerbitSecretKey, bearerToken: seerbitBearerToken });
const axios = require('axios');

const client = new Client(config);

const headers = {
    "Authorization": `Bearer ${bearerToken}`,
    "Content-Type": "application/json"
}

const seerbit_endpoints = {
    getBankInfo: `${url}pocket/api/v2/payout/banks`,
}

module.exports = {
    initializePayment: async (params) => {
        try {
            const {email, amount, paymentReference} = params;
            const standardCheckout = new StandardCheckout(client)
            const {status, data} = await standardCheckout.Initialize({
                callbackUrl: `${client_url}wallet`,//${api_url}/api/transactions/verify`,
                email, amount, paymentReference,
                country: "NG",
                currency: "NGN",
            });
    
            return data
        } catch (error) {
            console.log(error);
            throw error
        }
    },

    getBankInfo: async () => {
        const config = {
            headers,
            method: "POST", 
            url: `https://seerbitapi.com/pocket/api/v2/payout/banks`,
            data:{"publicKey": publicKey}
        }

        const {status, data: {payload}} = await axios(config);
        return payload;
    },

    withdraw: async (params) => {
        try {
            const {reference, amount, accountNumber, bankCode} = params
            const config = {
                headers:{
                    "Authorization": "Bearer " + seerbitBearerToken,
                    "Content-Type": "application/json"
                },
                method: "POST", 
                url: `https://seerbitapi.com/pocket/api/v2/payout/transfer`,
                data:{
                    "extTransactionRef": reference, 
                    "publicKey": seerbitPublicKey,
                    "amount": amount,
                    "accountNumber": accountNumber,
                    "bankCode": bankCode,
                    "debitPocketReferenceId": "SBP0000024",
                    "type":"CREDIT_BANK",
                }
            }
            const {status, data: {payload}} = await axios(config);
            return payload;
        } catch (error) {
            console.log(error.response)
            throw error
        }
    },

    createPaymentLink: async (params) => {
        try {
            const {reference, email, amount, name, description, customizationName} = params
            const config = {
                headers:{
                    "Authorization": "Bearer " + seerbitBearerToken,
                    "Content-Type": "application/json"
                },
                method: "POST", 
                url: `https://paymentlink.seerbitapi.com/paymentlink/v2/payLinks/api`,
                data:{
                    "publicKey": seerbitPublicKey,
                    "amount": amount,
                    "status": "ACTIVE",
                    "paymentLinkName": name,
                    "successMessage":"Thank you for your payment",
                    "customizationName": customizationName,
                    "paymentFrequency":"RECURRENT",
                    "description": description,
                    "currency": "NGN",
                    "email":email,
                    "paymentReference": reference,
                    "linkExpirable":false,
                    "expiryDate":"",
                    "oneTime":false,
                    "requiredFields": {
                        "address":true,
                        "amount":true,
                        "customerName":true,
                        "mobileNumber":true,
                        "invoiceNumber":false
                    },
                }
            }

            const {status, data: {data}} = await axios(config);
            return data.paymentLinks;

        } catch (error) {
            console.log(error.response);
            throw error;
        }
    }
}