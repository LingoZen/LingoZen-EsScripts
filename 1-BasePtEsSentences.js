var fs = require('fs');
var elasticsearch = require('elasticsearch');
var elasticSearchClient = new elasticsearch.Client({
    host: "localhost:9200",
    requestTimeout: 0
});

/**
 * Load Base sentences and add missing dates
 */
var basePtEs = JSON.parse(fs.readFileSync('1-BasePtEsSentences.json', 'utf8'));
basePtEs.forEach(function (sentence, index) {
    basePtEs[index].addedDate = new Date();
    basePtEs[index].lastModifiedDate = basePtEs[index].addedDate;
});

/**
 * Populate to es
 */
var body = [];
basePtEs.forEach(function (sentence) {
    var sentenceToInsertIntoBody = {
        _type: 'sentence',
        _id: sentence.id
    };

    switch (sentence.language) {
        case 'spanish':
            sentenceToInsertIntoBody._index = 'lingozen-spanish';
            break;
        case 'portuguese':
            sentenceToInsertIntoBody._index = 'lingozen-portuguese';
            break;
        case 'english':
            sentenceToInsertIntoBody._index = 'lingozen-english';
            break;
        default:
            return console.error("Unknown lang ", sentence.language);
    }

    body.push(sentenceToInsertIntoBody);
    body.push(sentence);
});

elasticSearchClient.bulk({body: body.join('\n')}, function (error, response) {
    if (error) {
        return console.error("ERROR: ", error);
    }

    if (response.errors) {
        console.error("there was an error in response");
        return console.error(JSON.stringify(response.items));
    }

    console.log(response);
});
