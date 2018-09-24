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
var app = {
  state : {
    storageRef : firebase.storage().ref(),
    file : false
  },

 /**
  * Toggles sidebar visibility
  */
  toggleSidebar : function( event ) {
    event.stopPropagation();

    $('#sidebar').toggleClass('hidden');
  },

  /**
   * Toggles user dialog visibility
   */
  toggleUserDialog : function( e ) {
    e && e.stopPropagation();

    $('#user-dialog').fadeToggle( 300 );

    app.setCloseDialogListener( '#user-dialog', 'fadeOut', 300 );
  },

  setCloseDialogListener( id, action, arg ) {
    let closeDialog = function( event ) {
      if( $( id ).is( $( event.target ) ) || $( id ).has( $( event.target ) ).length > 0 ) {
        return;
      }
      $( id )[action]( arg );
      $( 'body' ).off(`click.${id}`);
    }

    $( 'body' ).on(`click.${id}`, closeDialog );
  },

 /**
  * Main function that launches on page init
  */
  init : function() {
    let fileSelect = $('#file-select');

    $('#user-logo').click( this.toggleUserDialog );
    $('#logout').click( this.logout );
    $('#sidebar-toggle').click( app.toggleSidebar );
    $('#upload-form').submit( this.upload.uploadPhoto );
    $('#upload-input').change( this.upload.fileChange );
    $('#upload-button').click( this.upload.toggleUploadMenu );
    $('#upload-background').click( this.upload.toggleUploadMenu );

    // init handlers for drag-n-drop functionality
    fileSelect.on( 'dragenter' , app.upload.drag );
    fileSelect.on( 'dragover'  , app.upload.drag );
    fileSelect.on( 'drop'      , app.upload.drop );

    // trigger click for hidden input
    fileSelect.find('.upload-button').click( function( event ) {
      $('#upload-input').trigger('click')
    });

    // launch listener on authentication status changes
    this.listenAuthChanges();
  },

 /**
  * Object that contains all methods for uplaod functionality
  */
  upload : {

   /**
    * Handler for dragenter/ dragover 
    */
    drag : function( event ) {
      event.stopPropagation();
      event.preventDefault();
    },

   /**
    * Main method, launches when user drops file
    */
    drop : function( event ) {
      // prevent default browser behaviour( opening file )
      event.stopPropagation();
      event.preventDefault();

      app.state.file = event.originalEvent.dataTransfer.files[0];
      $('#file-name').text( app.state.file.name );
    
      app.upload.uploadPhoto();
    },

   /**
    * Toggle upload menu visibility
    */
    toggleUploadMenu : function( event ) {
      $('#upload-menu').fadeToggle( 200 );
    },

   /**
    * Main method for photo uploading
    */
    uploadPhoto : function( event ) {
      event.preventDefault();
      
      if( !app.state.file ) {
        return;
      }

      // init upload animation
      app.upload.toggleUploadAnimation();

      // start uploading
      app.state.storageRef.child(`users/${Auth.currentUser.uid}`).put( app.state.file )
      .then( function( response ) {
        // Upload completed successfully, now we can get the download URL
        response.ref.getDownloadURL().then( function( photoUrl )
        {
          // set url's on user profile and logo
          app.setPhotoUrl( photoUrl );
          app.upload.toggleUploadAnimation();

          // close upload menu
          app.upload.toggleUploadMenu();

          $('#upload-input').val('');
          $('#file-name').text('Drag files here');
          app.state.file = false;
        });
      })
      .catch( function( error ) {
        console.log( error );
      });
    },

   /**
    * Handle file selection
    */
    fileChange : function( event ) {
      app.state.file = event.target.files[0];
      $('#file-name').text( app.state.file.name );
    },

   /**
    * Toggles uploading animation
    */
    toggleUploadAnimation : function( event ) {
      $('#file-select .upload-button').fadeToggle( 300 );
      $('#file-name').fadeToggle( 300 );
      $('#file-select').toggleClass('loading');
    },
  },

 /**
  * Launches listener for authentication state changes
  */
  listenAuthChanges : function() {
    Auth.onAuthStateChanged( function( user ) {
      if( user )
      {
        // if user is signed, get his photo from storage
        app.state.storageRef.child(`users/${Auth.currentUser.uid}`).getDownloadURL().then( function( response ) {
          // if photo found in storage
          app.setPhotoUrl( response );
          app.removeLoading();
        })
        .catch( function( error ) {
          // if no photo found in storage, look for photos in user's providers
          let photoUrl = user.providerData[0] && user.providerData[0].photoURL || user.photoURL || 'static/assets/UserIcon.png';
          
          app.setPhotoUrl( photoUrl );
          app.removeLoading();
        });

        app.setUserName();
      }
    });
  },

 /**
  * Set photo url for user logo and profile photo
  */
  setPhotoUrl : function( photoUrl ) {
    ['#user-profile-photo img', '#user-logo'].forEach( function( id )
    {
      // remove current src, thus removing possible flash of old image
      $( id ).attr('src', '' );
      $( id ).one('load', app.removeLoading( id ) );
      $( id ).attr('src', photoUrl );
    });
  },

  removeLoading : function( id ) {
    $( id ).closest('.loading').removeClass('loading');
  },

 /**
  * Shows user's display name
  */
  setUserName : function() {
    $('#user-email').text( Auth.currentUser.email );
  },

 /**
  * Logout user
  */
  logout : function( event ) {
    app.toggleUserDialog();

    document.location = '/logout';
  }
}

$( document ).ready( function()
{
  app.init();
})