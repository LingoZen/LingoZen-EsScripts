var fs = require('fs');
var async = require('async');
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
async.each(basePtEs, function (sentence, iteratorCb) {
    var sentenceToInsertIntoBody = {
        type: 'sentence',
        id: sentence.id,
        body: sentence
    };

    switch (sentence.language) {
        case 'spanish':
            sentenceToInsertIntoBody.index = 'lingozen-spanish';
            break;
        case 'portuguese':
            sentenceToInsertIntoBody.index = 'lingozen-portuguese';
            break;
        case 'english':
            sentenceToInsertIntoBody.index = 'lingozen-english';
            break;
        default:
            return iteratorCb(new Error("Unknown lang " + sentence.language));
    }

    elasticSearchClient.create(sentenceToInsertIntoBody, function (err, response) {
        if (err) {
            return iteratorCb(err)
        }

        console.log(response);
        iteratorCb();
    });
}, function (err) {
    if (err) {
        console.error(err);
    }
});
