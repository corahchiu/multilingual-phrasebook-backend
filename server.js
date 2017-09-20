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

app.post('/search', function(req, res){
  // get all equivalent phrases
  var phrase = req.body.phrase;
  var language = req.body.language;
  session
    .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b) RETURN n,b`)
    .then(result => {
      session.close();
      let allPhrases = {};
      // get original phrase
      const singleRecord = result.records[0];      
      const node = singleRecord.get(0);
      allPhrases[node.properties.language] = node.properties.phrase;

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
      console.log(allPhrases);      
      res.json(allPhrases);
    })  
    .catch(function(err){
      console.log(err);
    })

  // // Don't delete. For future reference. This is sepecific for wed2
  // // get translated phrases of one specific language and put in an array with the language as key
  // var phrase = req.body.phrase;
  // var language = req.body.language;
  // var targetLanguage = req.body.targetLanguage;

  // session
  // .run(`MATCH (n {phrase:'${phrase}', language:'${language}'})-[:translation]->(b {language:'${targetLanguage}'}) RETURN n,b`)
  // .then(result => {
  //   session.close();
  //   console.log(result); // give undefined for target language. why?
  //   let allPhrases = {};
  //   // get original phrase
  //   const singleRecord = result.records[0];    
  //   const mainNode = singleRecord.get(0);
  //   allPhrases[mainNode.properties.language] = mainNode.properties.phrase;

  //   for (i=0; i<result.records.length; i++){    
  //           const singleRecord = result.records[i];
  //           const targetNode = singleRecord.get(1);
  //           allPhrases[targetNode.properties.language] = []    
  //   }
  //   for (i=0; i<result.records.length; i++){    
  //     const singleRecord = result.records[i];
  //     const targetNode = singleRecord.get(1);
  //     allPhrases[targetNode.properties.language].push(targetNode.properties.phrase);
  //   }
  //   console.log(allPhrases);      
  //   res.send(allPhrases);
  // })  
  // .catch(function(err){
  //   console.log(err);
  // })
});


app.post('/addphrase', function(req,res){
  var phrase = req.body.phrase;
  session.run(`CREATE (n:${phrase})`).then(() => {
    session.close();
  });
  
})

const port = process.env.PORT || '3000';
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => console.log(`API running on localhost:${port}`));