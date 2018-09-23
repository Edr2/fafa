var utils = {
  sendRequest : function( method, url, data, callback, errorHandler ) {
    $.ajax( url, {
      'method' : method,
      'data' : data
    })
    .done( callback )
    .fail( errorHandler );
  }
}