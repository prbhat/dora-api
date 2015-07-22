var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');
var properties = require ("properties");
var async = require ("async");
var fs = require('fs');
var lineReader = require('line-reader');
var HashMap = require('HashMap');
var url = require('url');

var zip2destinations;



router.get('/recommend', function(req, res) {

    var url_parts = url.parse(req.url, true);
    var email = url_parts.query.email;


    var emailInput = req.body.email;
    var zip2destinationsFileName = 'routes/zip2destinations.txt'
    var jsonObj = {}

    if (!zip2destinations) {
        zip2destinations = new HashMap();
        lineReader.eachLine(zip2destinationsFileName, function(line, last) {
            console.log(line);
            var strSplit = line.split("=")
            winston.info(strSplit)
            zip2destinations.set(strSplit[0], strSplit[1])
              // do whatever you want with line...
            if(last){
                // or check if it's the last one
                console.log('Done parsing file')
                
                var listOfDestsStr = zip2destinations.get(email)
                var recommendedDestinationsArray = listOfDestsStr.split("|")
                
                jsonObj = {'email':email, 'destinations': recommendedDestinationsArray}

                res.send(jsonObj)
            }
        });
    }
    else {
        
        var listOfDestsStr = zip2destinations.get(email)
        var recommendedDestinationsArray = listOfDestsStr.split("|")
        
        jsonObj = {'email':email, 'destinations': recommendedDestinationsArray}

        res.send(jsonObj)

    }

});


router.get('/inspire_file', function(req, res) {

    var url_parts = url.parse(req.url, true);
    var destination = url_parts.query.destination;

    var inspireFileName = destination.trim().toLowerCase()
    winston.log(inspireFileName)
    var pathToFile = 'routes/' + inspireFileName + '.txt'
    //var pathToFile = 'routes/sanfranciscoca.txt'

    var jsonObj = {}
    var thingsToDoArray = []

    lineReader.eachLine(pathToFile, function(line, last) {
        console.log(line);
        var strSplit = line.split("|")
        winston.info(strSplit)
        var currentThingToDo = {'name' : strSplit[0], 'url': strSplit[1]}
        thingsToDoArray.push(currentThingToDo)
          // do whatever you want with line...
        if(last){
            // or check if it's the last one
            console.log('Done parsing file')
            jsonObj = {'things-to-do' : thingsToDoArray}
            

            res.send(jsonObj)
        }
    });


});

router.get('/hotrate', function(req, res) {

    async.series([
        function(callback){
            // do some stuff ...
            destinationInput = getDestination(req)
            callback(null, destinationInput);
        },
        function(callback){
            // do some more stuff ...
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            //destinationInput = 'San Francisco, CA'
            winston.info('Getting hotrate for destination ' + destinationInput)
            winston.info('About to call Hotwire api')

            // ===========================
            var HW_URI_PREFIX = 'http://api.hotwire.com/v1/deal/hotel?dest='
            var HW_URI_SUFFIX = '&apikey=k7z7vx6m2p7kd85wsgb2nb5e&limit=1&format=json'
            var HW_URI = HW_URI_PREFIX + destinationInput + HW_URI_SUFFIX


            // Call HW API to get best deal
            request({
                    uri: HW_URI,
                    method: 'GET',
                }, function (error, response) {

                  if (error) {
                    winston.error('===== Error While Getting Data from Hotwire====');
                    callback(null);
                  } 
                  else {
                    
                    var hw_response = JSON.parse(response.body);
                    winston.info('======= Got Results from HW ======== ');
                    winston.log(hw_response)
                    var deal = hw_response.Result.HotelDeal                

                   var json = {'star' : deal.StarRating, 'price': deal.Price}

                    callback(null, json);
                  }
                });
            // ===========================
            
        }
    ],
    // optional callback
    function(err, results){
        //console.log(venueId2Url)
        res.send(results[1])
    });


});


router.get('/inspirehack', function(req, res) {

    var thingToDo1 = {'name': 'thing one', 'url': 'url1'}
    var thingToDo2 = {'name': 'thing two', 'url': 'url2'}
    var thingsToDo = [thingToDo1, thingToDo2]

    var deals = {'star': '4', 'hotrate': '100', 'retailrate': '200'}

    var inspire = {'things-to-do': thingsToDo, 'deals': deals}

    res.send(inspire)

});


router.get('/inspire1', function(req, res) {

    var venueId2Name = new HashMap()
    var venueId2Url = new HashMap()

    async.series([
        function(callback){
            // do some stuff ...
            destinationInput = getDestination(req)
            callback(null, destinationInput);
        },
        function(callback){
            // do some more stuff ...
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            //destinationInput = 'San Francisco, CA'
            winston.info('Getting inspiration for destination ' + destinationInput)
            winston.info('About to call Foursquare api')

            // ===========================
            var FOURSQUARE_URI_PREFIX = 'https://api.foursquare.com/v2/venues/explore?near='
            var FOURSQUARE_URI_SUFFIX = '&oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var FOURSQUARE_URI = FOURSQUARE_URI_PREFIX + destinationInput + FOURSQUARE_URI_SUFFIX


            // Call Foursquare API to get things to do
            request({
                    uri: FOURSQUARE_URI,
                    method: 'GET',
                }, function (error, response) {

                  if (error) {
                    winston.error('===== Error While Getting Data from Foursquare====');
                    callback(null);
                  } 
                  else {
                    var foursquare_response = JSON.parse(response.body);
                    winston.info('======= Got Results from Foursquare ======== ');

                    var items = foursquare_response.response.groups[0].items                  

                    // Get top 5 venues
                    for(var i = 0; i < items.length && i < 5; i++) {
                        venueId2Name.set(items[i].venue.id, items[i].venue.name)
                        console.log("COPY THIS:", items[i].venue.name)
                    }

                    callback(null, venueId2Name.values());
                  }
                });
            // ===========================
            
        },
        function(callback) {

            var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
            var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var venueIdKeys = venueId2Name.keys()
            var fsImages = []

            for(var i = 0; i < venueIdKeys.length; i++) {
                var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIdKeys[i] + FOURSQUARE_URI_IMAGE_SUFFIX

                // Call Foursquare API to get things to do
                request({
                        uri: FOURSQUARE_IMAGE_URI,
                        method: 'GET',
                    }, function (error, response) {

                      if (error) {
                        winston.error('===== Error While Getting Photo Data from Foursquare====');
                        callback(null);
                      } 
                      else {
                        var foursquare_photo_response = JSON.parse(response.body);
                        winston.info('======= Got Photo Results from Foursquare ======== ');

                        var items = foursquare_photo_response.response.photos.items                  

                        // Get top venue photos
                        for(var j = 0; j < items.length && j < 1; j++) {
                            var imageUrl = items[j].prefix + items[j].width + 'x' + items[j].height + items[j].suffix
                            winston.info("COPY THIS", imageUrl)
                            fsImages.push(imageUrl)
                            //venueId2Url.set(currentVenueId, imageUrl)
                        }
                      }

                    });
            }
            callback(null, fsImages)
            
        }
    ],
    // optional callback
    function(err, results){
        //console.log(venueId2Url)
        res.send(results)
    });


});


router.get('/inspire', function(req, res) {

    var destinationInput
    var thingsToDo
    var venueIds = []

    async.series([
        function(callback){
            // do some stuff ...
            destinationInput = getDestination(req)
            callback(null, destinationInput);
        },
        function(callback){
            // do some more stuff ...
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            //destinationInput = 'San Francisco, CA'
            winston.info('Getting inspiration for destination ' + destinationInput)
            winston.info('About to call Foursquare api')

            // ===========================
            var FOURSQUARE_URI_PREFIX = 'https://api.foursquare.com/v2/venues/explore?near='
            var FOURSQUARE_URI_SUFFIX = '&oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var FOURSQUARE_URI = FOURSQUARE_URI_PREFIX + destinationInput + FOURSQUARE_URI_SUFFIX
            var topVenues = []
            var thingsToDo = []
            var venueInfo = {}
            

            // Call Foursquare API to get things to do
            request({
                    uri: FOURSQUARE_URI,
                    method: 'GET',
                }, function (error, response) {

                  if (error) {
                    winston.error('===== Error While Getting Data from Foursquare====');
                    callback(null);
                  } 
                  else {
                    var foursquare_response = JSON.parse(response.body);
                    winston.info('======= Got Results from Foursquare ======== ');

                    var items = foursquare_response.response.groups[0].items                  

                    // Get top venues
                    for(var i = 0; i < items.length && i < 5; i++) {
                        //topVenues.push(items[i].venue.name)
                        //venueInfo = {'name': items[i].venue.name, 'id': items[i].venue.id}
                        //thingsToDo.push(venueInfo)
                        //venueIds.push(items[i].venue.id)


                        // ============================================
                        var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
                        var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
                        var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + items[i].venue.id + FOURSQUARE_URI_IMAGE_SUFFIX
                        var venueImages = []

                        request({
                            uri: FOURSQUARE_IMAGE_URI,
                            method: 'GET',
                        }, function (error, response) {

                          if (error) {
                            winston.error('===== Error While Getting Photo Data from Foursquare====');
                            callback(null);
                          } 
                          else {
                            var foursquare_photo_response = JSON.parse(response.body);
                            winston.info('======= Got Photo Results from Foursquare ======== ');

                            var items = foursquare_photo_response.response.photos.items                  

                            // Get top venue photos
                            
                            for(var i = 0; i < items.length && i < 1; i++) {
                                //topVenues.push(items[i].venue.name)
                                var imageUrl = items[i].prefix + items[i].width + 'x' + items[i].height + items[i].suffix
                                winston.info(imageUrl)

                                //imageUrlArray.push(imageUrl)
                                //venueInfo = {'name': items[i].venue.name, 'id': items[i].venue.id, 'image-url': imageUrl}
                                //venueInfo.set('image-url', imageUrl)
                                //thingsToDo.push(venueInfo)
                                venueImages.push(imageUrl)
                                venueInfo = {'name': items[i].venue.name, 'id1': items[i].venue.id, 'images' : imageUrl}

                            }

                            

                          }
                        });
                        //venueInfo.set('images', venueImages)
                        //venueInfo = {'name': items[i].venue.name, 'id1': items[i].venue.id, 'images' : venueImages}
                        thingsToDo.push(venueInfo)

                    }

                    winston.info('Image urls = ' + venueImages)
                    callback(null, thingsToDo);

                  }
                }).end();
            // ===========================
            
        }

        // function(callback) {

        //     var FOURSQUARE_URI_IMAGE_PREFIX = 'https://api.foursquare.com/v2/venues/'
        //     var FOURSQUARE_URI_IMAGE_SUFFIX = '/photos?oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
        //     var imageUrlArray = []

         
        //     for(var i = 0; i < venueIds.length; i++) {
        //         var FOURSQUARE_IMAGE_URI = FOURSQUARE_URI_IMAGE_PREFIX + venueIds[i] + FOURSQUARE_URI_IMAGE_SUFFIX

        //         winston.info('Venue id = ' + FOURSQUARE_IMAGE_URI)
        //         // Call Foursquare API to get things to do
        //         request({
        //                 uri: FOURSQUARE_IMAGE_URI,
        //                 method: 'GET',
        //             }, function (error, response) {

        //               if (error) {
        //                 winston.error('===== Error While Getting Photo Data from Foursquare====');
        //                 callback(null);
        //               } 
        //               else {
        //                 var foursquare_photo_response = JSON.parse(response.body);
        //                 winston.info('======= Got Photo Results from Foursquare ======== ');

        //                 var items = foursquare_photo_response.response.photos.items                  

        //                 // Get top venue photos
                        
        //                 for(var i = 0; i < items.length && i < 1; i++) {
        //                     //topVenues.push(items[i].venue.name)
        //                     var imageUrl = items[i].prefix + items[i].width + 'x' + items[i].height + items[i].suffix
        //                     winston.info(imageUrl)

        //                     imageUrlArray.push(imageUrl)
        //                 }

                        

        //               }
        //             });
        //     }

        //     callback(null, imageUrlArray)
            
        // }
    ],
    // optional callback
    function(err, results){
        //winston.info('Async ' + results)
        winston.info('IMAGE URLS=' + results[2])
        res.send(results)
    });


});



function getDestination(req) {
    var url_parts = url.parse(req.url, true);
    return url_parts.query.destination;
}


module.exports = router;
