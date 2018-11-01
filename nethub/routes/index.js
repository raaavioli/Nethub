var express = require('express');
var async = require('async');
const { Pool } = require('pg');
var router = express.Router();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'password',
  port: 5432,
})

var filtergroups = [
  'languages',
  'genres',
  'actors',
  'directors',
  'users',
  'movies'
];

/* GET home page. */
router.get('/', function(req, res, next) {
  values = new Object();
  var i = 0;

  async.forEach(filtergroups, function(filtergroup, callback) {
    pool.query('SELECT * FROM '+filtergroup, (err, result) => {
      if (err) {
        console.log(err.stack)
      } else {
        values[filtergroup] = result.rows
        i++;
        tryRender(res, i)
      }
    })
  }, function(err) {
      if (err) return next(err);
      // all queries are done here
  });
});

router.post('/watched', function(req, res){
  user = req.body.user

  var watchquery = "SELECT users.name AS username, \
  movies.name AS moviename, \
  watched.rating \
  FROM watched \
  JOIN movies ON movies.ID = watched.movie_ID \
  JOIN users ON users.ID = watched.user_ID \
  WHERE users.name = '"+user+"'";

  if(/^default$/.test(user)){
    console.log("User cannot be \"Default\"")
    res.send(req.body.user);
  }else{
    poolquery(watchquery,res)
  }
});

router.post("/watchMovie", function(req, res) {
  var query = "INSERT INTO watched SELECT \
  (SELECT id FROM users WHERE name = '"+req.body.user+"') AS user_id, \
  (SELECT id FROM movies WHERE name = '"+req.body.movie+"') AS movie_id, \
  CURRENT_DATE, \
  5 AS rating"

  poolquery(query,res)
});

router.post("/login", function(req, res) {
  var query = "UPDATE users \
  SET last_logged_in = CURRENT_DATE \
  WHERE name = '"+req.body.user+"'"

  poolquery(query,res)
})

router.post("/updaterating", function(req, res){
  var updatequery = "UPDATE watched \
  SET rating = "+req.body.rating+" \
  WHERE movie_id = \
    (SELECT ID FROM movies WHERE name = '"+req.body.movie+"') \
  AND user_id = \
    (SELECT id FROM users WHERE name = '"+req.body.user+"')";

  poolquery(updatequery,res)
});

router.post("/searched", function(req, res) {
  var filtervalues = JSON.parse(req.body.filters)
  var query = "\
  SELECT name AS moviename, round(avg(rating)) AS rating FROM movies \
  JOIN watched ON movies.id = watched.movie_id \
  WHERE id IN (";
  var count = 0;

  if(filtervalues.languages.length > 0){
    query += "(SELECT movie_id \
      FROM language_in \
      WHERE language_id IN \
      (SELECT id FROM languages WHERE language IN "+getArrayAsSQLString(filtervalues.languages)+") \
      AND type = 'spoken') INTERSECT "
    count++;
  }

  if(filtervalues.genres.length > 0){
    query += "(SELECT movie_id \
      FROM genre_of \
      WHERE genre_id IN \
      (SELECT id FROM genres WHERE name IN "+getArrayAsSQLString(filtervalues.genres)+")) INTERSECT "
    count++;
  }

  if(filtervalues.subtitles.length > 0){
    query += "(SELECT movie_id \
      FROM language_in \
      WHERE language_id IN \
      (SELECT id FROM languages WHERE language IN "+getArrayAsSQLString(filtervalues.subtitles)+") \
      AND type = 'subtitle') INTERSECT "
    count++;
  }

  if(filtervalues.actors.length > 0){
    query += "(SELECT movie_id \
      FROM stars_in \
      WHERE actor_id IN \
      (SELECT id FROM actors WHERE name IN "+getArrayAsSQLString(filtervalues.actors)+")) INTERSECT "
    count++;
  }

  if(filtervalues.directors.length > 0){
    query += "(SELECT movie_id \
      FROM directs \
      WHERE director_id IN \
      (SELECT id FROM directors WHERE name IN "+getArrayAsSQLString(filtervalues.directors)+")) INTERSECT "
      count++;
  }

  if(filtervalues.movietype.length > 0){
    if(filtervalues.movietype.includes('Series')){
      query += "(SELECT movie_id FROM movie_in) INTERSECT "
      count++;
    }

    if(filtervalues.movietype.includes('Movie')){
      query += "(SELECT id FROM movies WHERE id NOT IN (SELECT movie_id FROM movie_in)) INTERSECT "
      count++;
    }
  }

  if(filtervalues.rating.length > 0){
    query += "(SELECT movie_id FROM \
      (SELECT movie_id, round(avg(rating)) \
      FROM watched \
      GROUP BY movie_id) AS foo \
      WHERE round IN "+getArrayAsSQLString(filtervalues.rating)+") INTERSECT "
    count++;
  }

  query = query.replace(/(.+)INTERSECT $/, "$1");
  query += ")"

  if( count == 0){
    query = "SELECT name AS moviename, round(avg(rating)) AS rating FROM movies \
    JOIN watched ON movies.id = watched.movie_id WHERE movies.id NOT IN \
      (SELECT movie_id FROM watched WHERE user_id = \
        (SELECT id FROM users WHERE name = '"+req.body.user+"')) "
  }else{
    query+= "AND id NOT IN (SELECT movie_id FROM watched WHERE user_id = \
      (SELECT id FROM users WHERE name = '"+req.body.user+"')) "
  }

  query += "GROUP BY movies.name";
  poolquery(query,res)
});

function poolquery(query, res) {
  pool.query(query, (err, result) => {
    if (err) {
      console.log(err.stack)
    } else {
      res.send(result.rows);
    }
  })
}

function getArrayAsSQLString(array){
  var arrayString = "(";
  for (var i = 0; i < array.length; i++) {
    if(i > 0)
      arrayString+=","
    arrayString+="\'"+array[i]+"\'"
  }
  return arrayString+")"
}

function tryRender(res, i){
  if(i == filtergroups.length){
    renderData(res, values);
  }
}

function renderData(res, values) {
  res.render('index', {
    users: values['users'],
    languages: values['languages'],
    genres: values['genres'],
    subtitles: values['languages'],
    actors: values['actors'],
    directors: values['directors']
  });
}


module.exports = router;
