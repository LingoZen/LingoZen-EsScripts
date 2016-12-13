let fs = require('fs');
let async = require('async');
let elasticsearch = require('elasticsearch');
let elasticSearchClient = new elasticsearch.Client({
    // host: "search-lz-es-asjzii5ehwnhh3fmzpihgvcdrq.us-east-1.es.amazonaws.com",
    host: "localhost:9200",
    requestTimeout: 0
});

let originals = JSON.parse(fs.readFileSync('./scrapper/scrapped.json', 'utf8'));
let translations = JSON.parse(fs.readFileSync('./scrapper/translation.json', 'utf8'));

let supportedLanguages = [
    'czech'
    , 'dutch'
    , 'english'
    , 'french'
    , 'italian'
    , 'german'
    , 'greek'
    , 'hindi'
    , 'portuguese'
    , 'russian'
    , 'spanish'
    // , 'japanese'
    // , 'korean'
];

let numberOfSentencesToAdd = 0;
Object.keys(translations).forEach(language => {
    if (supportedLanguages.indexOf(language) > -1) {
        numberOfSentencesToAdd += translations[language].length;
    }
});
originals.forEach(original => {
    if (supportedLanguages.indexOf(original.language) > -1) {
        numberOfSentencesToAdd++;
    }
});

let counter = 0;
/**
 * Populate to es
 */
async.eachSeries(Object.keys(translations),
    (language, langCb) => {
        if (supportedLanguages.indexOf(language) === -1) {
            console.warn(`Skipping ${language} because it is not supported`);
            return langCb(); //unsupported lang, skip
        }

        async.eachSeries(translations[language],
            function (sentence, iteratorCb) {
                let now = new Date();
                sentence.addedDate = now;
                sentence.lastModifiedDate = now;
                sentence.isActive = true;
                sentence.likes = 0;
                sentence.dislikes = 0;
                sentence.flagged = false;
                sentence.idUser = 1;

                let sentenceToInsertIntoBody = {
                    type: 'sentence',
                    id: sentence.id,
                    body: sentence
                };

                sentenceToInsertIntoBody.index = getIndexName(language);

                elasticSearchClient.create(sentenceToInsertIntoBody, function (err, response) {
                    if (err) {
                        if (err.displayName === 'Conflict') {
                            console.warn(`Duplicate id ${sentenceToInsertIntoBody.id}, skipping`);
                        } else {
                            return iteratorCb(err);
                        }
                    }

                    counter++;

                    if (counter % 100) {
                        return iteratorCb();
                    }

                    console.log(`Added ${counter} of ${numberOfSentencesToAdd}. ${(counter / numberOfSentencesToAdd * 100).toFixed(0)}%`);
                    iteratorCb();
                });
            },
            function (err) {
                langCb(err);
            })
    },
    function (err) {
        if (err) {
            return console.error(err);
        }

        async.eachSeries(originals, (original, originalItCb) => {
            if (supportedLanguages.indexOf(original.language) === -1) {
                console.warn(`Skipping ${original.id} because it has unsupported language ${original.language}`);
                return originalItCb(); //unsupported lang, skip
            }

            let sentenceToInsertIntoBody = {
                type: 'sentence',
                id: original.id,
                body: original
            };

            sentenceToInsertIntoBody.index = getIndexName(original.language);

            elasticSearchClient.create(sentenceToInsertIntoBody, function (err, response) {
                if (err) {
                    if (err.displayName === 'Conflict') {
                        console.warn(`Duplicate id ${sentenceToInsertIntoBody.id}, skipping`);
                    } else {
                        return originalItCb(err);
                    }
                }

                counter++;

                if (counter % 100) {
                    return originalItCb();
                }

                console.log(`Added ${counter} of ${numberOfSentencesToAdd}. ${(counter / numberOfSentencesToAdd * 100).toFixed(0)}%`);
                originalItCb();
            });
        }, (err) => {
            if (err) {
                return console.error(err);
            }

            console.log(`Added ${counter} of ${numberOfSentencesToAdd}. ${(counter / numberOfSentencesToAdd * 100).toFixed(0)}%`);
            console.log('Indexed all successfully');
        })
    }
);

function getIndexName(language) {
    if (supportedLanguages.indexOf(language) > -1) {
        return `lingozen-${language}`;
    }

    throw new Error(`Unknown lang ${original.language}`);
}
