// Get dependencies
const express = require('express');
const path = require('path');
const http = require('http');
const axios = require('axios');
const bodyParser = require('body-parser');
const logger = require('morgan');
const neo4j = require('neo4j-driver').v1;

// Get our API routes
const api = require('./server/routes/api');

const app = express();

const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'pizza'));
const session = driver.session();

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, '../multilingual-phrasebook/dist')));

// Set our api routes
app.use('/api', api);

// Register a callback to know if driver creation was successful:
driver.onCompleted = function () {
  console.log('Driver created')
  // proceed with using the driver, it was successfully instantiated
};

// Register a callback to know if driver creation failed.
// This could happen due to wrong credentials or database unavailability:
driver.onError = function (error) {
  console.log('Driver instantiation failed', error);
};

app.get('/', function(req,res){
  console.log('hello');
// Get all available languages from the database and put in an array on init
const languagesPromise = session.run(
  'MATCH (n) RETURN n.language ORDER BY n.language'
);

languagesPromise.then(result => {
  session.close();
  let allLanguageValues = [];
  for (i=0; i<result.records.length; i++){    
    const singleRecord = result.records[i];
    const node = singleRecord.get(0);
    allLanguageValues.push(node);
  }
  var languages = [...new Set(allLanguageValues)];
  console.log(languages);
  return languages;
  driver.close();
});
})
app.post('/addphrase', function(req,res){
  var phrase = req.body.phrase;
  session.run(`CREATE (n:${phrase})`).then(() => {
   session.close();
  });
})

// Catch all other routes and return the index file
app.get('/search', function(req, res){
  var phrase = req.body.phrase;
  
  session
    .run(`MATCH (n:${phrase} {Language: ${language}}) RETURN n`)
    .then(function(result){
      result.records.forEach(function(record){
        console.log(record);
      })  
      .catch(function(err){
        console.log(err);
      })
    })
  res.sendFile(path.join(__dirname, '../multilingual-phrasebook/dist/index.html'));
});


/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '3000';
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`));