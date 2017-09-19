// Get dependencies
const express = require('express');
const path = require('path');
const http = require('http');
const axios = require('axios');
const bodyParser = require('body-parser');
const logger = require('morgan');
const neo4j = require('neo4j-driver').v1;

const app = express();

const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'pizza'));
const session = driver.session();

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
// Point static path to dist
// app.use(express.static(path.join(__dirname, '../multilingual-phrasebook/dist')));

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

// Get all available languages from the database and put in an array on init
app.get('/', function(req,res){
  session
    .run('MATCH (n) RETURN DISTINCT n.language ORDER BY n.language') //this is a promise
    .then(result => {
      session.close();
      let allLanguageValues = [];
      for (i=0; i<result.records.length; i++){    
        const singleRecord = result.records[i];
        const node = singleRecord.get(0);
        allLanguageValues.push(node);
      }
      res.send(allLanguageValues);
    }) 
    .catch(function(err){
      console.log(err);
    })
})

// Search phrase in main language column
app.post('/search', function(req, res){
  // trying to get all the translated phrase in an array
  var phrase = req.body.phrase;
  var language = req.body.language;
  var targetLanguage = req.body.targetLanguage;

  // todo now I need to get the targetLanguage from the target language column
  session
  .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b {language:'English'}) RETURN n,b`)  
  // .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b {language:'${targetLanguage}'}) RETURN n,b`)
  .then(result => {
    session.close();
    let allPhrases = {};
    // get original phrase
    const singleRecord = result.records[0];    
    const mainNode = singleRecord.get(0);
    allPhrases[mainNode.properties.language] = mainNode.properties.phrase;

    for (i=0; i<result.records.length; i++){    
            const singleRecord = result.records[i];
            const targetNode = singleRecord.get(1);
            allPhrases[targetNode.properties.language] = []    
    }
    for (i=0; i<result.records.length; i++){    
      const singleRecord = result.records[i];
      const targetNode = singleRecord.get(1);
      allPhrases[targetNode.properties.language].push(targetNode.properties.phrase);
    }

    // allPhrases[targetNode.properties.language] = []
    // allPhrases[targetNode.properties.language].push(targetNode.properties.phrase);
    console.log(allPhrases);      
    res.send(allPhrases); //What is being sent to service?
  })  
  .catch(function(err){
    console.log(err);
  })

  // //result: { Hungarian: 'Szia', English: [ 'Hello' ] }
  // var phrase = req.body.phrase;
  // var language = req.body.language;
  // var targetLanguage = req.body.targetLanguage;

  // session
  // .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b {language:'English'}) RETURN n,b`)  
  // // .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b {language:'${targetLanguage}'}) RETURN n,b`)
  // .then(result => {
  //   session.close();
  //   let allPhrases = {};
  //   // get original phrase
  //   const singleRecord = result.records[0];    
  //   const mainNode = singleRecord.get(0);
  //   const targetNode = singleRecord.get(1);
  //   allPhrases[mainNode.properties.language] = mainNode.properties.phrase;
  //   allPhrases[targetNode.properties.language] = []
  //   allPhrases[targetNode.properties.language].push(targetNode.properties.phrase);
  //   console.log(allPhrases);      
  //   res.send(allPhrases); //What is being sent to service?
  // })  
  // .catch(function(err){
  //   console.log(err);
  // })


  // // get all equivalent phrases
  // var phrase = req.body.phrase;
  // var language = req.body.language;
  // session
  //   .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b) RETURN n,b`)
  //   .then(result => {
  //     session.close();
  //     let allPhrases = {};
  //     // get original phrase
  //     const singleRecord = result.records[0];      
  //     const node = singleRecord.get(0);
  //     allPhrases[node.properties.language] = node.properties.phrase;
  //     // allPhrases.target = [];
  //     // get translated phrases
  //     for (i=0; i<result.records.length; i++){    
  //       const singleRecord = result.records[i];
  //       const node = singleRecord.get(1);
  //       // allPhrases.target.push(node.properties.phrase);
  //       allPhrases[node.properties.language] = node.properties.phrase;
        
  //     }
  //     console.log(allPhrases);      
  //     res.json(allPhrases);
  //   })  
  //   .catch(function(err){
  //     console.log(err);
  //   })

  // // get searched phrase
  // var phrase = req.body.phrase;
  // var language = req.body.language;
  // session
  //   .run(`MATCH (n {phrase:"${phrase}", language: "${language}"}) RETURN n`)
  //   .then(result => {
  //     session.close();
  //     const singleRecord = result.records[0];
  //     const node = singleRecord.get(0);
  //     res.send(node);
  //   })  
  //   .catch(function(err){
  //     console.log(err);
  //   })
});


app.post('/addphrase', function(req,res){
  var phrase = req.body.phrase;
  session.run(`CREATE (n:${phrase})`).then(() => {
    session.close();
  });
  
})

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