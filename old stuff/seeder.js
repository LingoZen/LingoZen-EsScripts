var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

client.ping({}, (err) => {
    if(err){
        return console.error(err);
    }


});