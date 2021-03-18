// google module.export for using external js files
// for each loop
// array.sort for sorting
// create new db for transactions and link to relevant stock to calculate average

module.exports = (data) => {
	let totPrice = 0;
	let totInvested = 0;
	let totDiv = 0;
	data.forEach((element) => {
		totPrice = totPrice + element.Price * element.Shares;
	});
	data.forEach((element) => {
		totDiv = totDiv + element.AnnualDiv * element.Shares;
	});
	data.forEach((element) => {
		totInvested = totInvested + element.Invested;
	});
	return {
		totDiv: Math.round(totDiv * 100) / 100,
		totPrice: Math.round(totPrice * 100) / 100,
		divPercent: Math.round(totDiv / totPrice * 10000) / 100 + '%',
		totInvested: totInvested
	};
};
