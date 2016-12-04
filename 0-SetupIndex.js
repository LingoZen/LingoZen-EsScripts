let elasticsearch = require('elasticsearch');
let async = require('async');
let elasticSearchClient = new elasticsearch.Client({
    // host: "search-lz-es-asjzii5ehwnhh3fmzpihgvcdrq.us-east-1.es.amazonaws.com",
    host: "localhost:9200"
});
let defaultMapping = {
    mappings: {
        sentence: {
            properties: {
                text: {
                    type: 'string',
                    fields: {
                        stemmed: {
                            type: 'string'
                        }
                    }
                },
                isActive: {
                    type: 'boolean'
                },
                likes: {
                    type: 'long'
                },
                dislikes: {
                    type: 'long'
                },
                flagged: {
                    type: 'boolean'
                },
                translationOf: {
                    type: 'string'
                },
                language: {
                    type: 'string'
                },
                idUser: {
                    type: 'long'
                },
                addedDate: {
                    type: 'date',
                    format: 'dateOptionalTime'
                },
                lastModifiedDate: {
                    type: 'date',
                    format: 'dateOptionalTime'
                }
            }
        }
    }
};

let languagesWithMappingHash = {
    czech: 'czech',
    dutch: 'dutch',
    english: 'english',
    french: 'french',
    italian: 'italian',
    // japanese: 'japanese',
    // korean: 'korean',
    german: 'german',
    greek: 'greek',
    hindi: 'hindi',
    portuguese: 'portuguese',
    russian: 'russian',
    spanish: 'spanish'
};

async.series([
    function waitForConnection(cb) {
        elasticSearchClient.ping(function (err) {
            cb();
        });
    },
    function deleteIndecies(cb) {
        async.each(Object.keys(languagesWithMappingHash),
            (language, langIt) => {
                let index = `lingozen-${language}`;
                elasticSearchClient.indices.exists({
                    index: index
                }, function (err, response) {
                    if (err) {
                        return langIt(err);
                    }

                    if (response) {
                        return elasticSearchClient.indices.delete({index: index}, function (err) {
                            langIt(err);
                        });
                    }

                    langIt();
                });
            }, (err) => {
                cb(err);
            });
    },

    function addIndecies(cb) {
        async.each(Object.keys(languagesWithMappingHash),
            (language, langIt) => {
                let index = `lingozen-${language}`;
                let mapping = JSON.parse(JSON.stringify(defaultMapping));
                mapping.mappings.sentence.properties.text.fields.stemmed.analyzer = languagesWithMappingHash[language];

                elasticSearchClient.indices.create({
                    index: index,
                    body: mapping
                }, function (err, response) {
                    langIt(err, response);
                });
            }, (err) => {
                cb(err);
            });
    }
], function (err) {
    if (err) {
        console.error(err);
    }
});
