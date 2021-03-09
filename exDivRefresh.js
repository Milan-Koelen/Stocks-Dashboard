var GivenDate = '2018-02-22';
var CurrentDate = new Date();
GivenDate = new Date(GivenDate);

if(GivenDate > CurrentDate){
    return;
}else{
    // request new dividend info (once every 2 days)
    alert('Given date is not greater than the current date.');
}