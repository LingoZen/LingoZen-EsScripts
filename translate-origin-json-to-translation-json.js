/**
 * THIS SCRIPT ENDS ON ERRORS EVERY NOW AND THEN DUE TO NODE FILESYSTEM NOT BEING ABLE TO PULL UP THE FILE OR THE TRANSLATION API TAKING A REALLY LONG TIME TO RETURN A RESPONSE.
 *
 * RUN THIS SCRIPT WITH FOREVER TO AUTO RESTART ON ERROR.
 *
 * THESE ERRORS DONT SEEM TO BE ANYTHING WE CAN FIX
 */

let fs = require('fs');
let querystring = require('querystring');
let https = require('https');
let async = require('async');
let uuid = require('node-uuid');

//grab the scrapped partial containing sentences that still need to be translated
//fs returned the contents as a string, turn it into a js object so we can use it
let allSentencesToBeTranslated = JSON.parse(fs.readFileSync('./scrapper/scrapped-partial.json', 'utf8'));

if (!allSentencesToBeTranslated || !allSentencesToBeTranslated.length) {
    return console.warn('Scrapped partial file contains empty array.');
}

console.log(`Starting translations. There are ${allSentencesToBeTranslated.length} sentences to be translated.`);

//contains the properties needed to create a request object for translation
const baseTranslateApiRequest = {
    host: 'www.googleapis.com',
    port: 443,
    path: '/language/translate/v2',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};
const languageNameToApiTranslationLanguageCodeMap = {
    english: 'en',
    spanish: 'es',
    portuguese: 'pt',
    russian: 'ru',
    japanese: 'ja',
    korean: 'ko',
    french: 'fr',
    italian: 'it',
    czech: 'cs',
    dutch: 'nl',
    german: 'de',
    greek: 'el',
    hindi: 'hi'
};
//there are just going to be the languages we defined in the map above
const languagesToTranslateSentencesTo = Object.keys(languageNameToApiTranslationLanguageCodeMap);
//translations is going to be an object with an array for each language; this comes from the map above
let translations = {};
languagesToTranslateSentencesTo.forEach(languageName => translations[languageName] = []);

/**
 * IF YOU GET SOCKET HANG UP ERRORS, LOWER THIS NUMBER
 */
const numberOfSentencesFromOriginToDoPerIteration = 20;
const backUpEveryXRuns = 5;

let numberOfRunsCompleted = 0;
let numberOfRunsStillNeeded = Math.ceil(allSentencesToBeTranslated.length / numberOfSentencesFromOriginToDoPerIteration);
const numberOfRunsThatNeedToBeDone = numberOfRunsStillNeeded;
const processStartTime = process.hrtime();
async.whilst(() => allSentencesToBeTranslated.length,
    function translateASubsetOfAllSentencesToBeTranslated(whilstCb) {
        //grab a subset of all sentences to be translated that will be translated and saved during this run
        let sentencesToTranslateThisIteration = allSentencesToBeTranslated.splice(0, numberOfSentencesFromOriginToDoPerIteration);

        //for each of these and for each language we want it translated to...
        async.eachSeries(sentencesToTranslateThisIteration,
            function translateOneSentenceForEveryLanguage(sentence, cb1) {
                async.each(languagesToTranslateSentencesTo,
                    function translateSentenceInOneLanguage(languageName, cb2) {
                        //... create a translation request for the translate api by copying and augmenting on the default options above..
                        let translationApiRequest = JSON.parse(JSON.stringify(baseTranslateApiRequest));
                        let queryParameters = {
                            key: 'AIzaSyCVA7xsRHiyq3nb30injngfY00zpsy3t2M',
                            q: sentence.text,
                            source: languageNameToApiTranslationLanguageCodeMap[sentence.language],
                            target: languageNameToApiTranslationLanguageCodeMap[languageName],
                        };
                        translationApiRequest.path += ('?' + querystring.stringify(queryParameters));

                        //... and send a request with the translation api request we defined above
                        let request = https.request(translationApiRequest, (response) => {
                            //we are getting back a unicode (utf) string
                            response.setEncoding('utf8');

                            //we will receive the request in parts, so we will create a empty string ang augment that string with every chunk we receive...
                            let translationDataAsStringFromResponse = '';
                            response.on('data', (chunk) => {
                                translationDataAsStringFromResponse += chunk;
                            });

                            //..once we received all the chunks we will have a string containing our response from the translation api
                            response.on('end', () => {
                                if (translationDataAsStringFromResponse === 'Unknown Error') {
                                    //there was an error with this translation, skip it and move on
                                    console.error(new Error("Error Translating"));
                                    return cb2();
                                }

                                //the api will send us a string but the string is a stringified json object containing a data which has the translation we care about
                                let translation = JSON.parse(translationDataAsStringFromResponse).data;

                                //make sure translation exists
                                if (
                                    translation &&
                                    translation.translations &&
                                    translation.translations[0] &&
                                    translation.translations[0].translatedText
                                ) {
                                    //and add it to our translation api
                                    translations[languageName].push({
                                        id: languageName + '_' + uuid.v4(),
                                        translationOf: sentence.id,
                                        language: languageName,
                                        text: translation.translations[0].translatedText
                                    });
                                }

                                //done, move on to next language
                                cb2();
                            });
                        });

                        //if at any time we got an error, end this run and return the error to the callback
                        request.on('error', (err) => {
                            return cb2(err);
                        });

                        //we have defined every event listener for request, send the actjual request to the api
                        request.end();
                    },
                    function translatedOneSentenceInAllLanguages(err) {
                        cb1(err);
                    }
                );
            },
            function translatedAllSentencesInAllLanguagesForThisSubsetRun(err) {
                //if there was an error, end the run, call the callback and fail everything
                if (err) {
                    return whilstCb(err);
                }

                //otherwise we want to save the translations in a file
                //get the translation file
                let translationFromFiles = JSON.parse(fs.readFileSync('./scrapper/translation.json', 'utf8'));

                if (!translationFromFiles) {
                    return whilstCb(new Error('translationFromFiles was null or undefined'));
                }

                //add the translations to the file
                Object.keys(translations).forEach(languageName => {
                    //if the trnalsation doesnt an arrya for that language, make one
                    if (!translationFromFiles[languageName] || !Array.isArray(translationFromFiles[languageName])) {
                        translationFromFiles[languageName] = [];
                    }

                    //add our translations to the array from the file
                    translationFromFiles[languageName] = translationFromFiles[languageName].concat(translations[languageName]);

                    // and empty out that translation array for next time
                    translations[languageName] = [];
                });

                //once all the translations have been added, save the file
                fs.writeFileSync('./scrapper/translation.json', JSON.stringify(translationFromFiles));

                //now that the translation have been set, we are done with this subset
                //so the remaining sentences in the allSentencesToBeTranslated array are all that need to trnanlsated
                //so save the current array in case we dont translate everythhing and need to finsih translations later
                fs.writeFileSync('./scrapper/scrapped-partial.json', JSON.stringify(allSentencesToBeTranslated));

                //if we saved and there was no error, we did it yay!!! time to move on to the next subset
                numberOfRunsCompleted++;
                numberOfRunsStillNeeded--;

                let elapsedTimeSoFar = process.hrtime(processStartTime);
                let estimatedTimeInSeconds = (1 / (numberOfRunsCompleted / numberOfRunsThatNeedToBeDone)) * elapsedTimeSoFar[0];

                let elapsedTimeInSeconds = elapsedTimeSoFar[0];
                let elapsedTimeInMinutes = 0;
                while (elapsedTimeInSeconds >= 60) {
                    elapsedTimeInMinutes++;
                    elapsedTimeInSeconds -= 60;
                }

                let estimatedTimeInMinutes = 0;
                while (estimatedTimeInSeconds >= 60) {
                    estimatedTimeInMinutes++;
                    estimatedTimeInSeconds -= 60;
                }

                console.log(`Finished run ${numberOfRunsCompleted}. There are ${numberOfRunsStillNeeded} remaining. ${(numberOfRunsCompleted / numberOfRunsThatNeedToBeDone * 100).toFixed(0)}% done. Elapsed Time: ${elapsedTimeInMinutes}min ${elapsedTimeInSeconds}s. Estimated Time left: ${estimatedTimeInMinutes.toFixed(0)}min ${estimatedTimeInSeconds.toFixed(0)}s`);

                if (numberOfRunsCompleted % backUpEveryXRuns) {
                    return whilstCb();
                }

                let now = (new Date()).toISOString().replace(/:/g, '-').replace(/\./g, '-');
                let backUpScrappedPartialFileName = `scrapped-partial_${now}.json`;
                let backUpTranslationFileName = `translation_${now}.json`;
                let backUpScrappedPartialFilePath = `./scrapper/backups/scrapped-partial/${backUpScrappedPartialFileName}`;
                let backUpTranslationFilePath = `./scrapper/backups/translations/${backUpTranslationFileName}`;

                //write files
                fs.writeFile(backUpScrappedPartialFilePath, JSON.stringify(allSentencesToBeTranslated), (err) => {
                    if (err) {
                        return whilstCb(err);
                    }

                    fs.writeFile(backUpTranslationFilePath, JSON.stringify(translationFromFiles), (err) => {
                        if (err) {
                            return whilstCb(err);
                        }

                        console.log(`Backed up partial scrape to ${backUpScrappedPartialFileName}`);
                        console.log(`Backed up translations to ${backUpTranslationFileName}`);

                        return whilstCb();
                    });
                });
            }
        );
    },
    function whilstLoopIsDoneAndAllSentencesInTheAllSentencesToBeTranslatedArrayHaveBeenTranslated(err) {
        //this callback
        if (err) {
            return console.error(err);
        }

        console.log('done');
    }
);
