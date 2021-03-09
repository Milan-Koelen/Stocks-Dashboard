// fetch('https://sandbox.iexapis.com/stable/stock/CSCO/dividends/1y?token=Tpk_b466790700ef4bfe92d935153c49a775')
// .then(res => res.json())
// .then(data => console.log(data))


fetch('https://sandbox.iexapis.com/stable/stock/' + Stockdetail.Symbol + '/quote?token=Tpk_b466790700ef4bfe92d935153c49a775')
    .then(res =>{
        console.log("Response waiting to parse...")
        return res.json()
    
    })
    .then(data => {
        console.log('Data parsed')
        console.log(data.symbol)
        console.log(data.companyName)
        console.log('$ ' + data.iexClose)
        console.log(data)
    })