var utils = {
  sendRequest : function( method, url, data, callback ) {
    $.ajax( url, {
      'method' : method,
      'data' : data,
      success : callback
    });
  }
}