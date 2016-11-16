var elasticsearch = require('elasticsearch');
var async = require('async');
var elasticSearchClient = new elasticsearch.Client({
    host: "localhost:9200"
});
var defaultMapping = {
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

async.series([
    function waitForConnection(cb) {
        elasticSearchClient.ping(function (err) {
            cb();
        });
    },
    function deletePortugueseIndex(cb) {
        elasticSearchClient.indices.exists({
            index: 'lingozen-portuguese'
        }, function (err, response) {
            if (err) {
                return cb(err);
            }

            if (response) {
                return elasticSearchClient.indices.delete({index: 'lingozen-portuguese'}, function (err) {
                    cb(err);
                });
            }

            cb();
        });
    },
    function deleteSpanishIndex(cb) {
        elasticSearchClient.indices.exists({
            index: 'lingozen-spanish'
        }, function (err, response) {
            if (err) {
                return cb(err);
            }

            if (response) {
                return elasticSearchClient.indices.delete({index: 'lingozen-spanish'}, function (err) {
                    cb(err);
                });
            }

            cb();
        });
    },
    function deleteEnglishIndex(cb) {
        elasticSearchClient.indices.exists({
            index: 'lingozen-english'
        }, function (err, response) {
            if (err) {
                return cb(err);
            }

            if (response) {
                return elasticSearchClient.indices.delete({index: 'lingozen-english'}, function (err) {
                    cb(err);
                });
            }

            cb();
        });
    },
    function addPortugueseIndex(cb) {
        var portugueseMapping = JSON.parse(JSON.stringify(defaultMapping));
        portugueseMapping.mappings.sentence.properties.text.fields.stemmed.analyzer = 'portuguese';

        elasticSearchClient.indices.create({
            index: 'lingozen-portuguese',
            body: portugueseMapping
        }, function (err, response) {
            cb(err, response);
        });
    },
    function addSpanishIndex(cb) {
        var spanishMapping = JSON.parse(JSON.stringify(defaultMapping));
        spanishMapping.mappings.sentence.properties.text.fields.stemmed.analyzer = 'spanish';

        elasticSearchClient.indices.create({
            index: 'lingozen-spanish',
            body: spanishMapping
        }, function (err, response) {
            cb(err, response);
        });
    },
    function addEnglishIndex(cb) {
        var englishMapping = JSON.parse(JSON.stringify(defaultMapping));
        englishMapping.mappings.sentence.properties.text.fields.stemmed.analyzer = 'english';

        elasticSearchClient.indices.create({
            index: 'lingozen-english',
            body: englishMapping
        }, function (err, response) {
            cb(err, response);
        });
    }
], function (err) {
    if (err) {
        console.error(err);
    }
});
