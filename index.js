const mongoose = require('mongoose');
const express = require('express');
const app = express();
const path = require('path');
const api_helper = require('./API_helper');
const methodOverride = require('method-override');
const { Stock, Value, ForEx } = require('./models');
const { promises } = require('fs');
const { parse } = require('path');
const Agenda = require('agenda');
const Agendash = require('agendash');

const jobs = require('./jobs');

//Totals calculated from file
const calculateTotals = require('./calculateTotals');

mongoose
	.connect(process.env['STOCKS_DB'], { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		console.log('stockPortfolio DB connected');
	})
	.catch((err) => {
		console.log('stockPortfolio DB Error');
		console.log(err);
	});

app.use(express.json());
app.use(express.static('views'));
app.use('/views', express.static(__dirname + '/views'));
app.use('/views/stocks', express.static(__dirname + '/views/stocks'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
mongoose.set('useFindAndModify', false);

// agenda console.log
// console.log(`Init job queue with db ${db}`);

const agenda = new Agenda({ db: { address: process.env['AGENDA_DB'] } });

// let Crypto = new ForEx({ Name: 'LTC', Symbol: 'LTCUSD' });

// Crypto.save(function(err, Crypto) {
// 	if (err) return console.log('error adding crypto');
// 	console.log(err);
// 	console.log(Crypto.Name + ' saved to crypto db');
// });

jobs.init(agenda);

app.use('/agenda', Agendash(agenda));

//API KEY ALPHAVANTAGE
// Welcome to Alpha Vantage! Your dedicated access key is: DV1D72RR1WRN3TUE. Please record this API key for future access to Alpha Vantage.

const port = 3000;

//Magic list of all stocks
app.get('/', async (req, res) => {
	const stocks = await Stock.find((err, data) => {
		if (err) console.error(err);
		// console.log(data);

		const totals = calculateTotals(data);

		res.render('stocks/dashboardIndex', { data, totals });
		// res.json(data);
	});
});
// stocks overview
app.get('/stocks', async (req, res) => {
	const stocks = await Stock.find((err, data) => {
		if (err) console.error(err);
		// console.log(data);

		const totals = calculateTotals(data);

		res.render('stocks/stocks', { data, totals });
		// res.json(data);
	});
});

// Add Stock Page
app.get('/stocks/addStock', (req, res) => {
	console.log('add new stock');
	console.log(req.body);
	console.log('render page');
	res.render('stocks/addStock');
	console.log('page renderd');
});
// Add Crypto Page
app.get('/stocks/addCrypto', (req, res) => {
	console.log('add new crypto');
	console.log(req.body);
	console.log('render page');
	res.render('stocks/addCrypto');
	console.log('page renderd');
});
// Magically add new crypto and data
app.post('/crypto', async (req, res) => {
	const newCrypto = new ForEx(req.body);
	// Requesting data from API
	await newCrypto.save().then((async) => {
		const req0 = api_helper.make_API_call(
			process.env['IEX_BASE_URL'] +
				'/stable/crypto/' +
				newCrypto.Symbol +
				'/price?token=' +
				process.env['IEX_TOKEN']
		);

		Promise(req0)
			.then((results) => {
				// Inserting data to MongoDB
				newCrypto.update(
					{
						$set: {
							Name: results[0]['companyName']
						}
					},
					(err, raw) => {
						if (err) console.error('db error', err);
						console.log(raw);
						res.redirect('stocks');
					}
				);
				console.log(newCrypto);
			})
			.catch((err) => {
				console.log(err);
			});
	});
});

//Magically add new stock and data
app.post('/stocks', async (req, res) => {
	const newStock = new Stock(req.body);
	// Requesting data from API
	await newStock.save().then((async) => {
		const req0 = api_helper.make_API_call(
			process.env['IEX_BASE_URL'] +
				'/stable/stock/' +
				newStock.Symbol +
				'/stats?token=' +
				process.env['IEX_TOKEN']
		);

		const req1 = api_helper.make_API_call(
			process.env['IEX_BASE_URL'] +
				'/stable/stock/' +
				newStock.Symbol +
				'/company?token=' +
				process.env['IEX_TOKEN']
		);

		const req2 = api_helper.make_API_call(
			process.env['IEX_BASE_URL'] +
				'/stable/stock/' +
				newStock.Symbol +
				'/dividends?token=' +
				process.env['IEX_TOKEN']
		);

		const req3 = api_helper.make_API_call(
			process.env['IEX_BASE_URL'] +
				'/stable/data-points/' +
				newStock.Symbol +
				'/ttmdividendrate?token=' +
				process.env['IEX_TOKEN']
		);

		Promise.all([ req0, req1, req2, req3 ])
			.then((results) => {
				// Inserting data to MongoDB
				newStock.update(
					{
						$set: {
							Name: results[0]['companyName'],
							Sector: results[1]['industry'],
							ExDivDate: results[0]['exDividendDate'],
							PayDay: results[2][0]['paymentDate'],
							DeclaredDiv: results[2][0]['amount'],
							DivFrequency: results[2][0]['frequency'],
							SharesOutstanding: results[0]['sharesOutstanding'],
							AnnualDiv: results[0]['ttmDividendRate'],
							DivDeclareDate: results[2][0]['declaredDate']
							// Logo:
						}
					},
					(err, raw) => {
						if (err) console.error('db error', err);
						console.log(raw);
						res.redirect('stocks');
					}
				);
				console.log(newStock);
			})
			.catch((err) => {
				console.log(err);
			});
	});
});

app.get('/stocks/:id/edit', async (req, res) => {
	const { id } = req.params;
	const Stockdetail = await Stock.findById(id);
	res.render('stocks/editStock', { Stockdetail });
});

app.put('/stocks/:id', async (req, res, e) => {
	const { id } = req.params;
	const stock = await Stock.findByIdAndUpdate(id, req.body, { runValidators: true });
	console.log('PUT!');
	res.redirect('/stocks');
});

//Magic single stock
//UNDER CONSTRUCTION
app.get('/stocks/:id', async (req, res, e) => {
	const { id } = req.params;
	const Stockdetail = await Stock.findById(id);
	// const symbol = await JSON.parse(Stockdetail.Symbol)
	// if (e) console.error(e);
	// else {
	// console.log(req);
	console.log('details');
	console.log(Stockdetail);
	// console.log(symbol)
	// console.log("Fetch API");
	// api_helper.make_API_call('https://sandbox.iexapis.com/stable/stock/' + Stockdetail.Symbol + '/quote?token=Tpk_b466790700ef4bfe92d935153c49a775')
	// .then(async res => {
	// 	// res.json(response);
	// 	const stock = await Stock.findByIdAndUpdate(id, {
	// 		Name: res.companyName,

	// 	}, {runValidators:true});
	// 	console.log("render page");

	// 	console.log("page rendered")
	// })
	// .catch(error => {
	//     console.log(error)
	// })
	res.render('stocks/detailsDashboard', { Stockdetail });

	// res.json(Stockdetail);
});

app.listen(port, () => {
	console.log(`Server is up at http://localhost:${port}`);
});

// const req1 = api_helper.make_API_call('https://sandbox.iexapis.com/stable/stock/' + Stockdetail.Symbol + '/quote?token=Tpk_b466790700ef4bfe92d935153c49a775')
// const req2 = api_helper.make_API_call('https://sandbox.iexapis.com/stable/stock/' + Stockdetail.Symbol + '/quote?token=Tpk_b466790700ef4bfe92d935153c49a775')
// const req3 = api_helper.make_API_call('https://sandbox.iexapis.com/stable/stock/' + Stockdetail.Symbol + '/quote?token=Tpk_b466790700ef4bfe92d935153c49a775')
// const req4 = api_helper.make_API_call('https://sandbox.iexapis.com/stable/stock/' + Stockdetail.Symbol + '/quote?token=Tpk_b466790700ef4bfe92d935153c49a775')

// Promise.all([req1, req2, req3, req4]).then(results=>{

// }).catch(err=>{
// 	console.log(err)
// })

// console.log('test')

/*


*/

// const newStock = new Stock({
//     Symbol: 'T',
//     Logo: '',
//     Sector: 'communications',
//     Shares: 1.08,
//     DivFrequency: 'quarterly',
//     Price: 28.146
// }).save().then((val)=>{
//     console.log(val);
// })

// Stock.find((err, res) => {
// 	if (err) console.error(err);
// 	console.log(res);
// });

// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function() {
//
// });
