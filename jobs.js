const express = require('express');
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
const api_helper = require('./API_helper');
const { Stock, Value, ForEx } = require('./models');
const app = express();
const request = require('request');

let agenda = null;

mongoose
	.connect(process.env['STOCKS_DB'], { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		console.log('stockPortfolio DB connected for jobs');
	})
	.catch((err) => {
		console.log('stockPortfolio DB Error');
		console.log(err);
	});

// Update Price
//1hr on opening hours
const job1 = async (job) => {
	const stocks = Stock.find((err, data) => {
		if (err) console.error(err);
		console.log('DivUpdate');
		let i = 0;
		for (let i = 0; i < data.length; i++) {
			const ForEx = data[i];
			console.log(data[i]['Name']);
			console.log(data[i]['Price']);
			const req = data[i]['Symbol'];
			updatePrice(req);
		}
	});
	const updatePrice = async (req) => {
		try {
			const result = await api_helper.make_API_call(
				`${process.env['IEX_BASE_URL']}/stable/stock/${req}/quote/latestPrice?token=${process.env['IEX_TOKEN']}`
			);
			console.log(result);
			// save in database here
			const query = { Symbol: req };
			Stock.updateOne(query, { Price: result }).then(console.log(req + ' updated'));
			return result;
		} catch (e) {
			console.error('error occurred updating ' + req, e);
			throw e;
		}
	};
};

const updateDivDate = async (req) => {
	try {
		const results = await api_helper.make_API_call(
			`${process.env['IEX_BASE_URL']}/stable/stock/${req}/dividends?token=${process.env['IEX_TOKEN']}`
		);

		const query = { Symbol: req };
		await Stock.updateOne(query, {
			$set: {
				DeclaredDiv: results[0]['amount'],
				PayDay: results[0]['paymentDate'],
				ExDivDate: results[0]['exDate'],
				Frequency: results[0]['frequency'],
				DeclaredDate: results[0]['declaredDate']
			}
		});
		return console.log(`==== UPDATE DONE ====`);
	} catch (e) {
		console.error('error occurred updating ' + req, e);
		throw e;
	}
};

const job2 = async (job) => {
	const stocks = Stock.find((err, data) => {
		if (err) console.error(err);
		console.log('DivUpdate');
		let i = 0;
		for (let i = 0; i < data.length; i++) {
			const DivDate = data[i]['PayDay'];
			const Today = new Date();
			if (DivDate > Today) {
				const ForEx = data[i];
				console.log(data[i]['Name']);
				const req = data[i]['Symbol'];
				updateDivDate(req);
			} else console.log(data[i]['Symbol'] + ' No updates required');
		}
	});
};

const job3 = async (job) => {
	console.log('============================');
	console.log('updating crypto prices');
	const cryptos = ForEx.find((err, data) => {
		if (err) console.error(err);
		console.log('Supported Cryptourrencies');
		let i = 0;
		for (let i = 0; i < data.length; i++) {
			const ForEx = data[i];
			console.log(data[i]['Name']);
			const req = data[i]['Symbol'];
			updateForEx(req);
		}
	});
	const updateForEx = async (req) => {
		try {
			const result = await api_helper.make_API_call(
				`${process.env['IEX_BASE_URL']}/stable/crypto/${req}/price?token=${process.env['IEX_TOKEN']}`
			);
			// save in database here
			console.log(`==== UPDATE ${req} ====`);
			console.log(result['price']);
			const query = { Symbol: req };
			ForEx.updateOne(query, { Price: result['price'] }).then(console.log(req + ' updated'));
			return console.log(`==== UPDATE DONE ====`);
		} catch (e) {
			console.error('error occurred updating ' + req, e);
			throw e;
		}
	};
	console.log(`==== UPDATE DONE ====`);
};

// Init agenda and register jobs
const init = async (agenda) => {
	await agenda.start();
	agenda.define('run job 1', job1);
	await agenda.every('30 minutes', 'run job 1');
	agenda.define('run job 2', job2);
	await agenda.every('7 days', 'run job 2');
	agenda.define('run job 3', job3);
	await agenda.every('30 minutes', 'run job 3');
};

module.exports = {
	init,
	job1,
	job2,
	job3
};
