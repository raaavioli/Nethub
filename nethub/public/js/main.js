$(document).ready(function(){
  addFilter();
  changeMenuAlternative();
  onUserChange();
});

function addFilter(){
  var selector = $('.wrapper').find('select');
  selector.change(function() {
    filtercontent = $(this).siblings('.filtercontent');
    if(!filtercontent.find("h4").text().includes($(this).val()) && !$(this).val().includes('default') ){
      filtercontent.append("\
        <div class='filter'>\
          <h4>"+$(this).val()+"</h4>\
        </div>"
      );
      loadSearchData();
      filtercontent.children().on('click', function() {
        $(this).remove();
        loadSearchData();
      })
    }
    $(this).val("default");
  });
}

function changeMenuAlternative() {
  $('.menu div').on('click', function() {
    $(this).siblings().addClass('notselected')
    $(this).removeClass('notselected')
    switch ($(this).index()){
      case 0:
        $(".watched").css("visibility", "visible")
        $(".searched").css("visibility", "hidden")
        break;
      case 1:
        $(".watched").css("visibility", "hidden")
        $(".searched").css("visibility", "visible")
        break;
    }
  })
}

function onUserChange(){
  $(".userselect select").change(function() {
    loadWatchedData()
    loadSearchData()
  });
}

function loadSearchData() {
  filtervalues = {};
  filtervalues.languages = getTextFromTags($("#Languages_id").find("h4"))
  filtervalues.genres = getTextFromTags($("#Genre_id").find("h4"))
  filtervalues.subtitles = getTextFromTags($("#Subtitles_id").find("h4"))
  filtervalues.actors = getTextFromTags($("#Actors_id").find("h4"))
  filtervalues.directors = getTextFromTags($("#Directors_id").find("h4"))
  filtervalues.movietype = getTextFromTags($("#MovieType_id").find("h4"))
  filtervalues.rating = getTextFromTags($("#Rating_id").find("h4"))

  console.log(filtervalues)
  $.ajax({
    url: "/searched",
    type: "post",
    data: { filters: JSON.stringify(filtervalues), user: getSelectedUser() }
  }).done(function( data ) {
    $(".searched").empty()
    appendMovieDiv(data, $(".searched"))
  })
}

function getTextFromTags(tags) {
  var values = [];
  tags.each(function() {
    values.push($(this).text())
  });

  return values
}

function loadWatchedData(){
  $.ajax({
    url: "/watched",
    type: "post",
    data: { user: getSelectedUser() }
    }).done(
    function( data ){
      if(data != 'default'){
        $(".watched").empty()
        appendMovieDiv(data, $(".watched"));
        setRatingHover();
        updateDbRating();
      }else{
        $(".watched").empty()
      }
    }
  );
}

function appendMovieDiv(data, parent) {
  for (var i = 0; i < data.length; i++) {
    var moviehtml = "\
    <div class='movie'>\
      <h4 class='moviename'>"+data[i].moviename+"</h4> \
      <div class='movierate'>\
        "+getDivStringFromRating(data[i].rating)+"\
      </div>"
    if(parent.hasClass("searched")){
      moviehtml += "\
      <div class=\"hovercover\">\
        <h4>Watch movie</h4>\
      </div>"
    }
    moviehtml+="</div>"
    parent.append(moviehtml);
  }

  setWatchMovieEvent()
}

function setWatchMovieEvent() {
  $(".hovercover").on('click', function() {
    var moviename = $(this).parent().find('.moviename').text()
    $.ajax({
      url: "/watchMovie",
      type: "post",
      data: { movie: moviename }
      }).done(function( data ){
        if(data != 'default'){
          /*$(".watched").empty()
          appendMovieDiv(data, $(".watched"));
          setRatingHover();
          updateDbRating();*/
        }else{
          $(".watched").empty()
        }
      }
    )
  })
}

function setRatingHover(){
  $(".watched").find(".movierate div").on('mouseover', function() {
    var currentRating = $(this).parent().children("div.selected").length;
    var siblingsandself = $(this).parent().children();
    setSelectedRating(siblingsandself, $(this).index())
  })
}

function setSelectedRating(divs, rating) {
  divs.each(function() {
    if($(this).index() <= rating)
      $(this).addClass('selected')
    else
      $(this).removeClass('selected')
  })
}

function updateDbRating(){
  $(".watched").find(".movierate div").on('click', function() {
    var currentRating = $(this).index() + 1
    var movieName = $(this).parent().siblings("h4").text()
    var userName = getSelectedUser()
    $.post("/updaterating", {rating: currentRating, movie: movieName, user: userName})
  })
}

function getSelectedUser(){
  return $(".userselect select option:selected").text()
}

function getDivStringFromRating(rating){
  var divstring = ""
  for (var i = 0; i < 5; i++) {
    if(i < rating){
      divstring+="<div class='selected'></div>"
    }else{
      divstring+="<div></div>"
    }
  }
  return divstring
}
