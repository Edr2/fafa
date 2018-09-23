var app = {
  dom : {
    sidebar          : $('#sidebar'),
    userDialog       : $('#user-dialog'),
    userLogo         : $('#user-logo'),
    userProfile      : $('#user-profile-photo'),
    uploadButton     : $('#upload-button'),
    uploadMenu       : $('#upload-menu'),
    uploadForm       : $('#upload-form'),
    uploadInput      : $('#upload-photo'),
    uploadBackground : $('#upload-background'),
    userProfilePhoto : $('#user-profile-photo img'),
  },
  state : {
    storageRef : firebase.storage().ref(),
    file : {}
  },

  toggleSidebar : function() {
    this.sidebar.toggleClass('hidden');
  },
  toggleUserDialog : function() {
    this.userDialog.fadeToggle( 300 );
  },

  init : function() {
    app.dom.uploadButton.click( this.upload.toggleUploadMenu );
    app.dom.uploadForm.submit( this.upload.uploadPhoto );
    app.dom.uploadInput.change( this.upload.fileChange );
    app.dom.uploadBackground.click( this.upload.toggleUploadMenu );
    app.dom.userLogo.click( this.toggleUserDialog );

    this.listenAuthChanges();
  },

  upload : {
    toggleUploadMenu : function( event ) {
      app.dom.uploadMenu.fadeToggle( 200 );
    },

    uploadPhoto : function( event ) {
      event.preventDefault();
      
      var uploadTask = app.state.storageRef.child(`users/${Auth.currentUser.uid}`).put( app.state.file );

      uploadTask.on( 'state_changed',
        function( snapshot ) {
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

          switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
              console.log('Upload is paused');
              break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
              console.log('Upload is running');
              break;
          }
        }, function(error) {
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case 'storage/unauthorized':
            console.log( error );
            // User doesn't have permission to access the object
            break;
          case 'storage/canceled':
            console.log( error );
            // User canceled the upload
            break;
          case 'storage/unknown':
            console.log( error );
            // Unknown error occurred, inspect error.serverResponse
            break;
        }
      }, function() {
        // Upload completed successfully, now we can get the download URL
        uploadTask.snapshot.ref.getDownloadURL().then( function( photoUrl ) {
          app.setPhotoUrl( photoUrl );
          app.upload.toggleUploadMenu();
          app.dom.uploadInput.val('');
        });
      });
    },

    fileChange : function( event ) {
        app.state.file = this.files[0];
    }

  },

  listenAuthChanges : function() {
    Auth.onAuthStateChanged( function( user ) {
      if( user ) {
        app.state.storageRef.child(`users/${Auth.currentUser.uid}`).getDownloadURL().then( function( response ) {
          app.setPhotoUrl( response );
          app.removeLoading();
        })
        .catch( function( error ) {
          let photoUrl = user.providerData[0] ? user.providerData[0].photoURL : user.photoURL;
  
          app.setPhotoUrl( photoUrl );
          app.removeLoading();
        })
      }
    });
  },

  setPhotoUrl : function( photoUrl ) {
    app.dom.userProfilePhoto.attr('src', photoUrl );
    app.dom.userLogo.attr('src', photoUrl );
  },

  removeLoading : function() {
    app.dom.userProfile.removeClass('loading');
  }
}

$( document ).ready( function()
{
  app.init();
})