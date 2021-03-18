const mongoose = require('mongoose');

module.exports = {};

const stockSchema = new mongoose.Schema({
	Symbol: String,
	Name: String,
	Logo: String,
	Sector: String,
	Shares: Number,
	Price: Number,
	Invested: Number,
	Orders: Array,
	DivFrequency: String,
	AnnualDiv: Number,
	DivYield: Number,
	MarketYield: Number,
	ExDivDate: Date,
	PayDay: Date,
	DeclaredDiv: Number,
	SharesOutstanding: Number,
	DivDeclaredDate: Date,
	updatedAt: Date
});

const valueSchema = new mongoose.Schema({
	Symbol: String,
	Price: Number,
	Value: Number
});

const forexSchema = new mongoose.Schema({
	Currency: String,
	Price: Number,
	Name: String,
	Symbol: String
});

module.exports.Stock = mongoose.model('Stock', stockSchema);
module.exports.Value = mongoose.model('Value', valueSchema);
module.exports.ForEx = mongoose.model('Forex', forexSchema);
