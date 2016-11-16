var fs = require('fs');
var parser = require('babyparse');

//Parse single file
fs.readFile('./origin.csv', 'utf8', function (err, csvString) {
    if (err) {
        return console.error(err);
    }
    //transform csv string into array
    var rows = parser.parse(csvString).data;

    //transform array with [0] = header, [1+] = data into json
    var sentences = [];
    var sentenceHeaders = {};
    rows[0].forEach(function (header, index) {
        sentenceHeaders[index] = header;
    });
    rows.slice(1).forEach((row) => {
        var sentence = {};
        row.forEach((subpart, index) => {
            sentence[sentenceHeaders[index]] = subpart.trim();
        });
        if (sentence.id !== '') {
            sentences.push(sentence);
        }
    });

    //remove numbers in beggining of sentence
    sentences.forEach((sentenceObject)=> {
        sentenceObject.text = removeNumbersFromTextBeginning(sentenceObject.text);
    });

    fs.writeFile('origin.json', JSON.stringify(sentences), (err) => {
        if (err) return console.error(err);
        console.log('It\'s saved!');
    });
});

function removeNumbersFromTextBeginning(text) {
    return text.replace(/^\d+ \s*/, '');
}
